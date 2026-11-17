// English Hunter System — Cloudflare Worker API
// Storage: D1 (binding DB) · AI feedback: Workers AI (binding AI) · Static app: ASSETS

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MANA_MAX = 30; // AI feedback casts per UTC day (keeps usage inside the Workers AI free tier)
const GATE_XP = { E: 40, D: 60, C: 80, B: 110, A: 150, S: 200 };
const XP_PER_MIN = 10;
const CATS = ['verb_form', 'tense', 'article', 'preposition', 'agreement', 'word_choice', 'l1_transfer', 'sentence_structure', 'spelling', 'other'];
const INTERVALS = [1, 3, 7, 14, 30, 60];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, date TEXT NOT NULL, type TEXT NOT NULL, activity TEXT, minutes REAL NOT NULL DEFAULT 0, xp INTEGER NOT NULL DEFAULT 0, ref TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)`,
  `CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, date TEXT NOT NULL, gate_id TEXT NOT NULL, rank TEXT, skill TEXT, exam TEXT, title TEXT, prompt TEXT, response TEXT, feedback TEXT, band REAL, score REAL, seconds INTEGER, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS errors (id TEXT PRIMARY KEY, date TEXT NOT NULL, category TEXT NOT NULL, wrong TEXT NOT NULL, correct TEXT NOT NULL, explanation TEXT, skill TEXT, attempt_id TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS phrases (id TEXT PRIMARY KEY, phrase TEXT NOT NULL UNIQUE, meaning TEXT, source TEXT, reps INTEGER NOT NULL DEFAULT 0, interval INTEGER NOT NULL DEFAULT 0, due TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tests (id TEXT PRIMARY KEY, date TEXT NOT NULL, source TEXT NOT NULL, reading REAL, listening REAL, writing REAL, speaking REAL, note TEXT, created_at TEXT NOT NULL)`,
];

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  schemaReady = true;
}

// ---------- helpers ----------
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (msg, status = 400) => { throw new HttpError(status, msg); };

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };
const addDays = (date, n) => { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (h) => new Uint8Array(h.match(/.{2}/g).map((b) => parseInt(b, 16)));
const wordCount = (t) => (t.trim().match(/\S+/g) || []).length;

async function getMeta(db, key) {
  const r = await db.prepare('SELECT value FROM meta WHERE key=?').bind(key).first();
  if (!r) return null;
  try { return JSON.parse(r.value); } catch { return r.value; }
}
const setMetaStmt = (db, key, value) =>
  db.prepare('INSERT INTO meta (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key, JSON.stringify(value));

async function hashPass(pass, saltHex) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: 100000 }, key, 256);
  return hex(bits);
}
const newToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));

async function requireAuth(req, db) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!/^[0-9a-f]{64}$/.test(token)) bad('Not signed in', 401);
  const r = await db.prepare('SELECT token FROM sessions WHERE token=?').bind(token).first();
  if (!r) bad('Session expired', 401);
  return token;
}

const eventStmt = (db, e) =>
  db.prepare('INSERT OR IGNORE INTO events (id,date,type,activity,minutes,xp,ref,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(e.id || uid(), e.date, e.type, e.activity || null, e.minutes || 0, Math.round(e.xp || 0), e.ref || null, now());

// Award once-per-day bonuses: 20 min keeps the streak alive, 90 min clears the Daily Quest.
async function dayBonuses(db, date) {
  const r = await db.prepare('SELECT COALESCE(SUM(minutes),0) AS m FROM events WHERE date=?').bind(date).first();
  const stmts = [];
  if (r.m >= 20) stmts.push(eventStmt(db, { id: 'min-' + date, date, type: 'bonus', ref: 'minimum', xp: 50 }));
  if (r.m >= 90) stmts.push(eventStmt(db, { id: 'full-' + date, date, type: 'bonus', ref: 'daily-quest', xp: 200 }));
  if (stmts.length) await db.batch(stmts);
}

async function manaUsed(db) {
  const key = 'ai:' + now().slice(0, 10);
  return { key, used: Number(await getMeta(db, key)) || 0 };
}

// ---------- AI feedback ----------
const FEEDBACK_SCHEMA = {
  type: 'object',
  properties: {
    band: { type: 'number' },
    cefr: { type: 'string' },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          wrong: { type: 'string' },
          correct: { type: 'string' },
          category: { type: 'string', enum: CATS },
          explanation: { type: 'string' },
        },
        required: ['wrong', 'correct', 'category', 'explanation'],
      },
    },
    upgraded_answer: { type: 'string' },
    phrases: {
      type: 'array',
      items: { type: 'object', properties: { phrase: { type: 'string' }, meaning: { type: 'string' } }, required: ['phrase', 'meaning'] },
    },
    next_focus: { type: 'string' },
  },
  required: ['band', 'cefr', 'summary', 'strengths', 'corrections', 'upgraded_answer', 'phrases', 'next_focus'],
};

const SYSTEM_PROMPT = `You are a strict, fair English examiner calibrated to the public IELTS band descriptors and the CEFR scale. The learner is an Indonesian adult whose productive level is around B1 and who is training to reach B2-C1.

Evaluate the learner's response to the task and reply with ONE JSON object only (no markdown, no extra text) with these keys:
- "band": IELTS-style band from 3.0 to 9.0 in 0.5 steps. Be honest, never generous. Off-topic or very short answers get 4.0 or lower.
- "cefr": one of A2, B1, B1+, B2, B2+, C1, C2.
- "summary": 1-2 sentences on overall performance, in simple English.
- "strengths": 1-3 short, specific points.
- "corrections": the 3-6 MOST important errors. Each has "wrong" (the learner's exact words, a short fragment of at most 12 words), "correct" (the corrected fragment), "category" (one of: ${CATS.join(', ')}) and "explanation" (at most 20 words, simple English). Use "l1_transfer" for Indonesian-style phrasing such as "give contribution" or "know about how". Never invent errors: if the text is correct, return fewer items.
- "upgraded_answer": rewrite the learner's OWN ideas one level higher (natural B2-C1 English), about the same length as the original and never longer than 260 words.
- "phrases": 2-3 useful collocations or phrases taken from your upgraded answer, each with a short "meaning".
- "next_focus": one concrete thing to practise next.

Watch closely for: verb forms after "to", modals and prepositions; articles (a/an/the); prepositions; subject-verb agreement; tense consistency; word choice.
If MODE is speaking, the text is an automatic speech-to-text transcript: ignore punctuation, capitalisation and spelling completely, and do not list them as errors. Judge grammar, vocabulary range, coherence and how fully the questions are answered.
If MODE is writing, also judge task achievement, organisation, and spelling.`;

function parseLooseJson(text) {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const a = text.indexOf('{'); const b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch { /* ignore */ } }
  return null;
}

async function runAI(env, userMsg) {
  const base = {
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMsg }],
    max_tokens: 1800,
    temperature: 0.2,
  };
  let out;
  try {
    out = await env.AI.run(MODEL, { ...base, response_format: { type: 'json_schema', json_schema: FEEDBACK_SCHEMA } });
  } catch {
    out = await env.AI.run(MODEL, base); // retry without JSON mode; we parse loosely below
  }
  let r = out?.response ?? out?.choices?.[0]?.message?.content ?? out;
  if (typeof r === 'string') r = parseLooseJson(r);
  if (!r || typeof r !== 'object') bad('The System could not read the AI reply. Please try again.', 502);
  return normalizeFeedback(r);
}

function normalizeFeedback(r) {
  const band = num(r.band, 0, 9);
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    band: band === null ? null : Math.round(band * 2) / 2,
    cefr: str(r.cefr, 6),
    summary: str(r.summary, 600),
    strengths: arr(r.strengths).map((s) => str(s, 200)).filter(Boolean).slice(0, 3),
    corrections: arr(r.corrections)
      .map((c) => ({
        wrong: str(c?.wrong, 200),
        correct: str(c?.correct, 200),
        category: CATS.includes(c?.category) ? c.category : 'other',
        explanation: str(c?.explanation, 240),
      }))
      .filter((c) => c.wrong && c.correct && c.wrong.toLowerCase() !== c.correct.toLowerCase())
      .slice(0, 8),
    upgraded_answer: str(r.upgraded_answer, 2400),
    phrases: arr(r.phrases).map((p) => ({ phrase: str(p?.phrase, 80), meaning: str(p?.meaning, 160) })).filter((p) => p.phrase).slice(0, 3),
    next_focus: str(r.next_focus, 300),
  };
}

function readGate(b) {
  const g = b.gate || {};
  const rank = GATE_XP[g.rank] ? g.rank : 'E';
  return {
    id: str(g.id, 40) || 'unknown',
    rank,
    skill: g.skill === 'writing' ? 'writing' : 'speaking',
    exam: str(g.exam, 20),
    title: str(g.title, 80),
  };
}

// ---------- routes ----------
async function route(req, env, url) {
  const db = env.DB;
  const path = url.pathname.replace(/\/+$/, '');
  const m = req.method;
  const body = async () => { try { return await req.json(); } catch { return {}; } };

  // --- auth ---
  if (path === '/api/auth/status' && m === 'GET') {
    return json({ configured: !!(await getMeta(db, 'auth')) });
  }
  if (path === '/api/auth/setup' && m === 'POST') {
    if (await getMeta(db, 'auth')) bad('Already set up. Please log in.', 409);
    const b = await body();
    const pass = typeof b.passphrase === 'string' ? b.passphrase : '';
    if (pass.length < 8) bad('Passphrase must be at least 8 characters.');
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const token = newToken();
    await db.batch([
      setMetaStmt(db, 'auth', { salt, hash: await hashPass(pass, salt) }),
      setMetaStmt(db, 'name', str(b.name, 24) || 'Hunter'),
      db.prepare('INSERT INTO sessions (token,created_at) VALUES (?,?)').bind(token, now()),
    ]);
    return json({ token });
  }
  if (path === '/api/auth/login' && m === 'POST') {
    const auth = await getMeta(db, 'auth');
    if (!auth) bad('Not set up yet.', 409);
    const fail = (await getMeta(db, 'auth_fail')) || { count: 0, until: 0 };
    if (fail.until > Date.now()) bad('Too many attempts. Try again in a few minutes.', 429);
    const b = await body();
    const ok = typeof b.passphrase === 'string' && (await hashPass(b.passphrase, auth.salt)) === auth.hash;
    if (!ok) {
      const count = fail.count + 1;
      await setMetaStmt(db, 'auth_fail', { count: count >= 8 ? 0 : count, until: count >= 8 ? Date.now() + 15 * 60000 : 0 }).run();
      bad('Wrong passphrase.', 401);
    }
    const token = newToken();
    await db.batch([
      db.prepare('INSERT INTO sessions (token,created_at) VALUES (?,?)').bind(token, now()),
      setMetaStmt(db, 'auth_fail', { count: 0, until: 0 }),
    ]);
    return json({ token });
  }

  const token = await requireAuth(req, db);

  if (path === '/api/auth/logout' && m === 'POST') {
    await db.prepare('DELETE FROM sessions WHERE token=?').bind(token).run();
    return json({ ok: true });
  }

  // --- full state ---
  if (path === '/api/state' && m === 'GET') {
    const date = url.searchParams.get('date');
    if (!isDate(date)) bad('date required');
    const [days, today, attempts, gateStats, errors, phrases, tests, quests, metaRows] = await db.batch([
      db.prepare('SELECT date, SUM(minutes) AS minutes, SUM(xp) AS xp FROM events GROUP BY date ORDER BY date'),
      db.prepare("SELECT COALESCE(activity,'other') AS activity, SUM(minutes) AS minutes FROM events WHERE date=? GROUP BY 1").bind(date),
      db.prepare('SELECT * FROM attempts ORDER BY created_at DESC LIMIT 60'),
      db.prepare('SELECT gate_id, COUNT(*) AS clears, MAX(band) AS best_band, MAX(score) AS best_score FROM attempts GROUP BY gate_id'),
      db.prepare('SELECT * FROM errors ORDER BY created_at DESC LIMIT 600'),
      db.prepare('SELECT * FROM phrases ORDER BY due, created_at'),
      db.prepare('SELECT * FROM tests ORDER BY date, created_at'),
      db.prepare("SELECT date, ref FROM events WHERE type='quest' ORDER BY date DESC LIMIT 300"),
      db.prepare("SELECT key, value FROM meta WHERE key IN ('name','targets') OR key=?").bind('ai:' + now().slice(0, 10)),
    ]);
    const meta = {};
    for (const r of metaRows.results) { try { meta[r.key] = JSON.parse(r.value); } catch { meta[r.key] = r.value; } }
    return json({
      name: meta.name || 'Hunter',
      targets: meta.targets || null,
      days: days.results,
      today: today.results,
      attempts: attempts.results.map((a) => ({ ...a, feedback: a.feedback ? parseLooseJson(a.feedback) : null })),
      gateStats: gateStats.results,
      errors: errors.results,
      phrases: phrases.results,
      tests: tests.results,
      quests: quests.results,
      mana: { used: Number(meta['ai:' + now().slice(0, 10)]) || 0, max: MANA_MAX },
    });
  }

  // --- study / drill / review time ---
  if (path === '/api/event' && m === 'POST') {
    const b = await body();
    if (!isDate(b.date)) bad('date required');
    const type = ['study', 'drill', 'review'].includes(b.type) ? b.type : 'study';
    const activity = ['debuff', 'speaking', 'writing', 'listening', 'phrases', 'other'].includes(b.activity) ? b.activity : 'other';
    const minutes = Math.round((num(b.minutes, 0, 180) || 0) * 10) / 10;
    const count = num(b.count, 0, 100) || 0;
    const xp = minutes * XP_PER_MIN + (type === 'drill' ? count * 5 : type === 'review' ? count * 3 : 0);
    if (minutes <= 0 && xp <= 0) bad('Nothing to log.');
    await eventStmt(db, { date: b.date, type, activity, minutes, xp }).run();
    await dayBonuses(db, b.date);
    return json({ ok: true, xp });
  }

  // --- AI-scored gate ---
  if (path === '/api/gate/ai' && m === 'POST') {
    const b = await body();
    if (!isDate(b.date)) bad('date required');
    const gate = readGate(b);
    const prompt = str(b.prompt, 3500);
    const response = str(b.response, 7000);
    const words = wordCount(response);
    if (words < 8) bad('Your answer is too short to evaluate.');
    const seconds = Math.round(num(b.seconds, 0, 7200) || 0);
    const mana = await manaUsed(db);
    if (mana.used >= MANA_MAX) bad('Mana depleted for today. It regenerates at 07:00 WIB.', 429);

    const wpm = gate.skill === 'speaking' && seconds >= 20 ? Math.round(words / (seconds / 60)) : null;
    const userMsg = [
      `TASK: ${gate.exam} - ${gate.title}`,
      `MODE: ${gate.skill}${gate.skill === 'speaking' ? ' (speech-to-text transcript)' : ''}`,
      `TASK PROMPT:\n${prompt}`,
      str(b.note, 300) ? `EXAMINER NOTE: ${str(b.note, 300)}` : '',
      `LEARNER RESPONSE (${words} words${wpm ? `, about ${wpm} words per minute` : ''}):\n${response}`,
    ].filter(Boolean).join('\n\n');

    let fb;
    try { fb = await runAI(env, userMsg); }
    catch (e) {
      if (e instanceof HttpError) throw e;
      bad('The AI examiner is unavailable right now. Your answer is still on this page - try again in a moment.', 502);
    }

    const id = uid();
    const minutes = Math.min(60, Math.round((seconds / 60) * 10) / 10);
    const xp = GATE_XP[gate.rank] + minutes * XP_PER_MIN;
    const stmts = [
      setMetaStmt(db, mana.key, mana.used + 1), // mana is only spent when the examiner actually answered
      db.prepare('INSERT INTO attempts (id,date,gate_id,rank,skill,exam,title,prompt,response,feedback,band,score,seconds,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, b.date, gate.id, gate.rank, gate.skill, gate.exam, gate.title, prompt, response, JSON.stringify(fb), fb.band, null, seconds, now()),
      eventStmt(db, { date: b.date, type: 'gate', activity: gate.skill, minutes, xp, ref: id }),
    ];
    for (const c of fb.corrections) {
      stmts.push(db.prepare('INSERT INTO errors (id,date,category,wrong,correct,explanation,skill,attempt_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .bind(uid(), b.date, c.category, c.wrong, c.correct, c.explanation, gate.skill, id, now()));
    }
    for (const p of fb.phrases) {
      stmts.push(db.prepare('INSERT OR IGNORE INTO phrases (id,phrase,meaning,source,reps,interval,due,created_at) VALUES (?,?,?,?,0,0,?,?)')
        .bind(uid(), p.phrase, p.meaning, gate.title, addDays(b.date, 1), now()));
    }
    await db.batch(stmts);
    await dayBonuses(db, b.date);
    return json({ id, feedback: fb, xp, wpm, words });
  }

  // --- locally scored gate (Listen & Repeat, Build a Sentence) ---
  if (path === '/api/gate/local' && m === 'POST') {
    const b = await body();
    if (!isDate(b.date)) bad('date required');
    const gate = readGate(b);
    const score = num(b.score, 0, 100) || 0;
    const seconds = Math.round(num(b.seconds, 0, 3600) || 0);
    const minutes = Math.min(30, Math.round((seconds / 60) * 10) / 10);
    const xp = Math.round(GATE_XP[gate.rank] * (score / 100)) + minutes * XP_PER_MIN;
    const id = uid();
    await db.batch([
      db.prepare('INSERT INTO attempts (id,date,gate_id,rank,skill,exam,title,prompt,response,feedback,band,score,seconds,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, b.date, gate.id, gate.rank, gate.skill, gate.exam, gate.title, '', str(b.detail, 3000), null, null, score, seconds, now()),
      eventStmt(db, { date: b.date, type: 'gate', activity: gate.skill, minutes, xp, ref: id }),
    ]);
    await dayBonuses(db, b.date);
    return json({ id, xp });
  }

  // --- phrase bank ---
  if (path === '/api/phrases' && m === 'POST') {
    const b = await body();
    const phrase = str(b.phrase, 80);
    if (!phrase || !isDate(b.date)) bad('phrase and date required');
    await db.prepare('INSERT OR IGNORE INTO phrases (id,phrase,meaning,source,reps,interval,due,created_at) VALUES (?,?,?,?,0,0,?,?)')
      .bind(uid(), phrase, str(b.meaning, 160), 'manual', b.date, now()).run();
    return json({ ok: true });
  }
  if (path === '/api/phrases/review' && m === 'POST') {
    const b = await body();
    if (!isDate(b.date)) bad('date required');
    const p = await db.prepare('SELECT reps FROM phrases WHERE id=?').bind(str(b.id, 40)).first();
    if (!p) bad('Phrase not found', 404);
    const reps = b.good ? p.reps + 1 : 0;
    const interval = b.good ? INTERVALS[Math.min(p.reps, INTERVALS.length - 1)] : 1;
    await db.prepare('UPDATE phrases SET reps=?, interval=?, due=? WHERE id=?').bind(reps, interval, addDays(b.date, interval), str(b.id, 40)).run();
    return json({ ok: true });
  }
  let mt;
  if ((mt = path.match(/^\/api\/(phrases|errors|tests)\/([\w-]{1,40})$/)) && m === 'DELETE') {
    await db.prepare(`DELETE FROM ${mt[1]} WHERE id=?`).bind(mt[2]).run();
    return json({ ok: true });
  }

  // --- raid: record a real test result (the ONLY thing that changes stats) ---
  if (path === '/api/tests' && m === 'POST') {
    const b = await body();
    if (!isDate(b.date)) bad('date required');
    const s = ['reading', 'listening', 'writing', 'speaking'].map((k) => num(b[k], 0, 100));
    if (s.some((v) => v === null)) bad('All four skill scores (0-100) are required.');
    await db.batch([
      db.prepare('INSERT INTO tests (id,date,source,reading,listening,writing,speaking,note,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .bind(uid(), b.date, str(b.source, 40) || 'EF SET', s[0], s[1], s[2], s[3], str(b.note, 200), now()),
      eventStmt(db, { id: 'raid-' + b.date, date: b.date, type: 'raid', ref: 'raid', xp: 600 }),
    ]);
    return json({ ok: true });
  }

  // --- side quests ---
  if (path === '/api/quests' && m === 'POST') {
    const b = await body();
    const key = str(b.key, 30);
    if (!isDate(b.date) || !/^[a-z0-9-]+$/.test(key)) bad('date and key required');
    await eventStmt(db, { id: `sq-${key}-${b.date}`, date: b.date, type: 'quest', ref: key, xp: 120 }).run();
    return json({ ok: true });
  }

  bad('Not found', 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      await ensureSchema(env.DB);
      return await route(req, env, url);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Server error. Please try again.' }, 500);
    }
  },
};
