// English Pathway — Cloudflare Worker API (two accounts)
// Storage: D1 (binding DB) · AI feedback: Workers AI (binding AI) · Static app: ASSETS

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const AI_POOL = 30; // AI feedback requests per UTC day for the whole account (Workers AI free tier)
const AI_USER_CAP = 20; // max per user per day, so one person can't use the whole pool
const OWNER = 'arief';
const USERS = [{ id: 'arief', name: 'Arief' }, { id: 'risti', name: 'Risti' }];
const CATS = ['verb_form', 'tense', 'article', 'preposition', 'agreement', 'word_choice', 'l1_transfer', 'sentence_structure', 'spelling', 'other'];
const INTERVALS = [1, 3, 7, 14, 30, 60];
const REVIEW_DAYS = { 1: 1, 2: 2, 3: 5, 4: 21 }; // mastery level → days until next review

const DEFAULT_PROFILE = {
  arief: { daily: 90, minimum: 20, restDays: [], focus: 'ielts-gt', start: '2026-11-17', end: '2027-03-31', targets: { speaking: 58, writing: 60, reading: 63, listening: 63 } },
  risti: { daily: 60, minimum: 20, restDays: [], focus: 'career-toefl', start: '2026-11-19', end: '2027-03-31', targets: { speaking: 55, writing: 55, reading: 63, listening: 63 } },
};

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, salt TEXT, hash TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'arief', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'arief', date TEXT NOT NULL, type TEXT NOT NULL, activity TEXT, minutes REAL NOT NULL DEFAULT 0, xp INTEGER NOT NULL DEFAULT 0, ref TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'arief', date TEXT NOT NULL, gate_id TEXT NOT NULL, rank TEXT, skill TEXT, exam TEXT, title TEXT, prompt TEXT, response TEXT, feedback TEXT, band REAL, score REAL, seconds INTEGER, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS errors (id TEXT PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'arief', date TEXT NOT NULL, category TEXT NOT NULL, wrong TEXT NOT NULL, correct TEXT NOT NULL, explanation TEXT, skill TEXT, attempt_id TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS phrases (id TEXT PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'arief', phrase TEXT NOT NULL, meaning TEXT, source TEXT, reps INTEGER NOT NULL DEFAULT 0, interval INTEGER NOT NULL DEFAULT 0, due TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(user_id, phrase))`,
  `CREATE TABLE IF NOT EXISTS tests (id TEXT PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'arief', date TEXT NOT NULL, source TEXT NOT NULL, reading REAL, listening REAL, writing REAL, speaking REAL, note TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS settings (user_id TEXT NOT NULL, effective_from TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (user_id, effective_from))`,
  `CREATE TABLE IF NOT EXISTS mastery (user_id TEXT NOT NULL, lesson_id TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 0, best REAL NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, last_date TEXT, next_review TEXT, PRIMARY KEY (user_id, lesson_id))`,
  `CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, from_user TEXT NOT NULL, to_user TEXT NOT NULL, kind TEXT NOT NULL, text TEXT, ref TEXT, created_at TEXT NOT NULL, read_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_to ON notes(to_user, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_errors_user ON errors(user_id, created_at)`,
];

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    ...SCHEMA.map((s) => db.prepare(s)),
    ...USERS.map((u) => db.prepare('INSERT OR IGNORE INTO users (id,name,created_at) VALUES (?,?,?)').bind(u.id, u.name, now())),
    ...USERS.map((u) => db.prepare('INSERT OR IGNORE INTO settings (user_id,effective_from,value) VALUES (?,?,?)').bind(u.id, '2000-01-01', JSON.stringify(DEFAULT_PROFILE[u.id]))),
  ]);
  schemaReady = true;
}

// ---------- helpers ----------
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const bad = (msg, status = 400) => { throw new HttpError(status, msg); };
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };
const addDays = (date, n) => { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (h) => new Uint8Array(h.match(/.{2}/g).map((b) => parseInt(b, 16)));
const wordCount = (t) => (t.trim().match(/\S+/g) || []).length;
const clientId = (v) => (/^c[a-z0-9]{6,24}$/.test(String(v || '')) ? v : uid());

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
const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)));

async function requireAuth(req, db) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!/^[0-9a-f]{64}$/.test(token)) bad('Not signed in', 401);
  const r = await db.prepare('SELECT token, user_id FROM sessions WHERE token=?').bind(token).first();
  if (!r) bad('Session expired', 401);
  return { token, user: r.user_id || OWNER };
}

async function optionalAuth(req, db) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const r = await db.prepare('SELECT user_id FROM sessions WHERE token=?').bind(token).first();
  return r ? { user: r.user_id } : null;
}
const sharesErrors = (rows) => { const last = rows[rows.length - 1]; try { return !!JSON.parse(last?.value || '{}').share?.errors; } catch { return false; } };
const sharesScores = (rows) => { const last = rows[rows.length - 1]; if (!last) return true; try { return JSON.parse(last.value).share?.scores !== false; } catch { return true; } };

const eventStmt = (db, user, e) =>
  db.prepare('INSERT OR IGNORE INTO events (id,user_id,date,type,activity,minutes,xp,ref,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(e.id || uid(), user, e.date, e.type, e.activity || null, e.minutes || 0, 0, e.ref || null, now());

async function aiUsage(db, user) {
  const day = now().slice(0, 10);
  const [total, mine] = await Promise.all([getMeta(db, 'ai:' + day), getMeta(db, `ai:${day}:${user}`)]);
  return { day, total: Number(total) || 0, mine: Number(mine) || 0 };
}

function validProfile(v, prev) {
  const p = { ...prev };
  if (v.daily != null) p.daily = num(v.daily, 15, 180) ?? prev.daily;
  if (v.minimum != null) p.minimum = num(v.minimum, 5, 60) ?? prev.minimum;
  if (p.minimum > p.daily) p.minimum = p.daily;
  if (Array.isArray(v.restDays)) p.restDays = [...new Set(v.restDays.map(Number).filter((d) => d >= 0 && d <= 6))].slice(0, 3);
  if (['ielts-gt', 'ielts-ac', 'toefl', 'career-toefl', 'general-teaching'].includes(v.focus)) p.focus = v.focus;
  if (v.share && typeof v.share === 'object') p.share = { scores: v.share.scores !== false, errors: !!v.share.errors };
  if (isDate(v.end) && v.end > (p.start || '2026-01-01')) p.end = v.end;
  if (v.targets && typeof v.targets === 'object') {
    p.targets = { ...prev.targets };
    for (const k of ['speaking', 'writing', 'reading', 'listening']) { const n = num(v.targets[k], 20, 100); if (n !== null) p.targets[k] = Math.round(n); }
  }
  return p;
}

// ---------- AI feedback ----------
const FEEDBACK_SCHEMA = {
  type: 'object',
  properties: {
    band: { type: 'number' },
    cefr: { type: 'string' },
    criteria: { type: 'object', properties: { task: { type: 'number' }, coherence: { type: 'number' }, lexical: { type: 'number' }, grammar: { type: 'number' } }, required: ['task', 'coherence', 'lexical', 'grammar'] },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: { wrong: { type: 'string' }, correct: { type: 'string' }, category: { type: 'string', enum: CATS }, explanation: { type: 'string' } },
        required: ['wrong', 'correct', 'category', 'explanation'],
      },
    },
    upgraded_answer: { type: 'string' },
    phrases: { type: 'array', items: { type: 'object', properties: { phrase: { type: 'string' }, meaning: { type: 'string' } }, required: ['phrase', 'meaning'] } },
    next_focus: { type: 'string' },
  },
  required: ['band', 'cefr', 'criteria', 'summary', 'strengths', 'corrections', 'upgraded_answer', 'phrases', 'next_focus'],
};

const SYSTEM_PROMPT = `You are a strict, fair English examiner calibrated to the public IELTS band descriptors and the CEFR scale. The learner is an Indonesian adult whose productive level is around B1 and who is training to reach B2-C1.

Evaluate the learner's response to the task and reply with ONE JSON object only (no markdown, no extra text) with these keys:
- "band": overall IELTS-style band from 3.0 to 9.0 in 0.5 steps. Be honest, never generous. Off-topic or very short answers get 4.0 or lower.
- "cefr": one of A2, B1, B1+, B2, B2+, C1, C2.
- "criteria": four IELTS-style sub-bands (3.0-9.0, 0.5 steps): "task" (task response / task achievement; for speaking: fluency and how fully the questions are answered), "coherence" (organisation and linking), "lexical" (vocabulary range and accuracy), "grammar" (grammatical range and accuracy). The overall band should be close to their average.
- "summary": 1-2 sentences on overall performance, in simple English.
- "strengths": 1-3 short, specific points.
- "corrections": the 3-6 MOST important errors. Each has "wrong" (the learner's exact words, a short fragment of at most 12 words), "correct" (the corrected fragment), "category" (one of: ${CATS.join(', ')}) and "explanation" (at most 20 words, simple English). Use "l1_transfer" for Indonesian-style phrasing such as "give contribution" or "know about how". Never invent errors: if the text is correct, return fewer items.
- "upgraded_answer": rewrite the learner's OWN ideas one level higher (natural B2-C1 English), about the same length as the original and never longer than 260 words.
- "phrases": 2-3 useful collocations or phrases taken from your upgraded answer, each with a short "meaning".
- "next_focus": one concrete thing to practise next.

Watch closely for: verb forms after "to", modals and prepositions; articles (a/an/the, including "a" before vowel sounds such as "a operations"); prepositions and dependent prepositions ("responsible for", "since/for"); subject-verb agreement; tense consistency (present perfect with "for/since"); word choice.
Each "explanation" must name the specific rule (e.g. "Use 'an' before a vowel sound", "'responsible' takes 'for' + -ing"). Never write vague explanations such as "use correct word" or "use correct preposition".
Before choosing the 3-6 corrections, scan the whole response sentence by sentence; prefer recurring patterns over one-off slips.
If a GRAMMAR FOCUS is given, check that point in every sentence and include any error of that type among the corrections.
If MODE is speaking, the text is an automatic speech-to-text transcript: ignore punctuation, capitalisation and spelling completely, and do not list them as errors. Judge grammar, vocabulary range, coherence and how fully the questions are answered.
If MODE is writing, also judge task achievement, organisation, and spelling.`;

function parseLooseJson(text) {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const a = text.indexOf('{'); const b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch { /* ignore */ } }
  return null;
}

async function runAI(env, userMsg) {
  const base = { messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMsg }], max_tokens: 1900, temperature: 0.2 };
  let out;
  try { out = await env.AI.run(MODEL, { ...base, response_format: { type: 'json_schema', json_schema: FEEDBACK_SCHEMA } }); }
  catch { out = await env.AI.run(MODEL, base); }
  let r = out?.response ?? out?.choices?.[0]?.message?.content ?? out;
  if (typeof r === 'string') r = parseLooseJson(r);
  if (!r || typeof r !== 'object') bad("The feedback couldn't be read. Try again.", 502);
  return normalizeFeedback(r);
}

function normalizeFeedback(r) {
  const half = (v) => { const n = num(v, 0, 9); return n === null ? null : Math.round(n * 2) / 2; };
  const arr = (v) => (Array.isArray(v) ? v : []);
  const c = r.criteria && typeof r.criteria === 'object' ? r.criteria : {};
  return {
    band: half(r.band),
    cefr: str(r.cefr, 6),
    criteria: { task: half(c.task), coherence: half(c.coherence), lexical: half(c.lexical), grammar: half(c.grammar) },
    summary: str(r.summary, 600),
    strengths: arr(r.strengths).map((s) => str(s, 200)).filter(Boolean).slice(0, 3),
    corrections: arr(r.corrections)
      .map((x) => ({ wrong: str(x?.wrong, 200), correct: str(x?.correct, 200), category: CATS.includes(x?.category) ? x.category : 'other', explanation: str(x?.explanation, 240) }))
      .filter((x) => x.wrong && x.correct && x.wrong.toLowerCase() !== x.correct.toLowerCase())
      .slice(0, 8),
    upgraded_answer: str(r.upgraded_answer, 2400),
    phrases: arr(r.phrases).map((p) => ({ phrase: str(p?.phrase, 80), meaning: str(p?.meaning, 160) })).filter((p) => p.phrase).slice(0, 3),
    next_focus: str(r.next_focus, 300),
  };
}

function readGate(b) {
  const g = b.gate || {};
  return {
    id: str(g.id, 40) || 'unknown',
    rank: /^[EDCBAS]$/.test(g.rank) ? g.rank : 'E',
    skill: g.skill === 'writing' ? 'writing' : 'speaking',
    exam: str(g.exam, 24),
    title: str(g.title, 80),
  };
}

// Mastery transitions (adapted from mastery learning): 0 not started · 1 attempted · 2 familiar · 3 proficient · 4 mastered
function nextLevel(cur, score, kind, date) {
  const lvl = cur?.level || 0;
  if (kind === 'diagnostic') return score >= 100 ? Math.max(lvl, 2) : Math.max(lvl, 1);
  if (score < 70) return lvl >= 3 ? 2 : 1;
  if (score < 100) return lvl >= 3 && score >= 80 ? lvl : Math.max(lvl === 4 ? 3 : lvl, 2);
  const spaced = cur?.last_date && daysBetween(cur.last_date, date) >= 2;
  if (lvl >= 3 && (kind === 'review' || kind === 'unit') && spaced) return 4;
  return Math.max(lvl, 3);
}

// ---------- routes ----------
async function route(req, env, url) {
  const db = env.DB;
  const path = url.pathname.replace(/\/+$/, '');
  const m = req.method;
  const body = async () => { try { return await req.json(); } catch { return {}; } };

  // --- auth (public) ---
  if (path === '/api/auth/status' && m === 'GET') {
    const r = await db.prepare('SELECT id, name, hash IS NOT NULL AS configured FROM users ORDER BY id').all();
    const out = { users: r.results.map((u) => ({ id: u.id, name: u.name, configured: !!u.configured })) };
    // A device that is signed in to either account may show both study streaks on the cover.
    const known = await optionalAuth(req, db);
    const date = url.searchParams.get('date');
    if (known && isDate(date)) {
      const [days, settings] = await db.batch([
        db.prepare('SELECT user_id, date, SUM(minutes) AS minutes FROM events WHERE date>=? GROUP BY user_id, date ORDER BY date').bind(addDays(date, -120)),
        db.prepare('SELECT user_id, effective_from, value FROM settings ORDER BY effective_from'),
      ]);
      for (const u of out.users) {
        u.days = days.results.filter((d) => d.user_id === u.id).map((d) => ({ date: d.date, minutes: d.minutes }));
        u.settings = settings.results.filter((x) => x.user_id === u.id).map((x) => ({ from: x.effective_from, ...JSON.parse(x.value) }));
      }
      out.signedInAs = known.user;
    }
    return json(out);
  }
  if (path === '/api/auth/setup' && m === 'POST') {
    const b = await body();
    const user = await db.prepare('SELECT * FROM users WHERE id=?').bind(str(b.user, 20)).first();
    if (!user) bad('Unknown account.', 404);
    if (user.hash) bad('This account is already set up. Sign in instead.', 409);
    if (user.id !== OWNER) bad('Ask Arief to set your starting passphrase in his Settings.', 403);
    const pass = typeof b.passphrase === 'string' ? b.passphrase : '';
    if (pass.length < 8) bad('Passphrase must be at least 8 characters.');
    const salt = newSalt(); const token = newToken();
    await db.batch([
      db.prepare('UPDATE users SET salt=?, hash=?, name=COALESCE(NULLIF(?,\'\'), name) WHERE id=?').bind(salt, await hashPass(pass, salt), str(b.name, 24), user.id),
      db.prepare('INSERT INTO sessions (token,user_id,created_at) VALUES (?,?,?)').bind(token, user.id, now()),
    ]);
    return json({ token, user: user.id });
  }
  if (path === '/api/auth/login' && m === 'POST') {
    const b = await body();
    const user = await db.prepare('SELECT * FROM users WHERE id=?').bind(str(b.user, 20)).first();
    if (!user || !user.hash) bad('This account is not set up yet.', 409);
    const failKey = 'auth_fail:' + user.id;
    const fail = (await getMeta(db, failKey)) || { count: 0, until: 0 };
    if (fail.until > Date.now()) bad('Too many attempts. Try again in a few minutes.', 429);
    const ok = typeof b.passphrase === 'string' && (await hashPass(b.passphrase, user.salt)) === user.hash;
    if (!ok) {
      const count = fail.count + 1;
      await setMetaStmt(db, failKey, { count: count >= 8 ? 0 : count, until: count >= 8 ? Date.now() + 15 * 60000 : 0 }).run();
      bad('Wrong passphrase.', 401);
    }
    const token = newToken();
    await db.batch([
      db.prepare('INSERT INTO sessions (token,user_id,created_at) VALUES (?,?,?)').bind(token, user.id, now()),
      setMetaStmt(db, failKey, { count: 0, until: 0 }),
    ]);
    return json({ token, user: user.id });
  }

  const { token, user } = await requireAuth(req, db);

  if (path === '/api/auth/logout' && m === 'POST') {
    await db.prepare('DELETE FROM sessions WHERE token=?').bind(token).run();
    return json({ ok: true });
  }
  if (path === '/api/auth/password' && m === 'POST') {
    const b = await body();
    const u = await db.prepare('SELECT * FROM users WHERE id=?').bind(user).first();
    if ((await hashPass(String(b.current || ''), u.salt)) !== u.hash) bad('Current passphrase is wrong.', 401);
    if (String(b.next || '').length < 8) bad('New passphrase must be at least 8 characters.');
    const salt = newSalt();
    await db.batch([
      db.prepare('UPDATE users SET salt=?, hash=? WHERE id=?').bind(salt, await hashPass(String(b.next), salt), user),
      db.prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').bind(user, token),
    ]);
    return json({ ok: true });
  }
  if (path === '/api/partner/passphrase' && m === 'POST') {
    if (user !== OWNER) bad('Only Arief can set a partner passphrase.', 403);
    const b = await body();
    const target = await db.prepare('SELECT * FROM users WHERE id=?').bind(str(b.user, 20)).first();
    if (!target || target.id === OWNER) bad('Unknown account.', 404);
    const pass = typeof b.passphrase === 'string' ? b.passphrase : '';
    if (pass.length < 8) bad('Passphrase must be at least 8 characters.');
    const salt = newSalt();
    await db.batch([
      db.prepare('UPDATE users SET salt=?, hash=? WHERE id=?').bind(salt, await hashPass(pass, salt), target.id),
      db.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id),
    ]);
    return json({ ok: true, user: target.id });
  }

  // --- together: cheers, notes and shared answers between the two accounts ---
  if (path === '/api/notes' && m === 'POST') {
    const b = await body();
    const kind = ['cheer', 'note', 'share'].includes(b.kind) ? b.kind : 'note';
    const to = await db.prepare('SELECT id FROM users WHERE id=? AND id<>?').bind(str(b.to, 20), user).first();
    if (!to) bad('Unknown partner.', 404);
    let ref = null;
    if (kind === 'share') {
      const a = await db.prepare('SELECT id FROM attempts WHERE id=? AND user_id=?').bind(str(b.ref, 40), user).first();
      if (!a) bad('Answer not found.', 404);
      ref = a.id;
    }
    const text = str(b.text, 400);
    if (kind === 'note' && !text) bad('Write a short note first.');
    await db.prepare('INSERT INTO notes (id,from_user,to_user,kind,text,ref,created_at) VALUES (?,?,?,?,?,?,?)').bind(clientId(b.id), user, to.id, kind, text, ref, now()).run();
    return json({ ok: true });
  }
  if (path === '/api/notes/read' && m === 'POST') {
    await db.prepare('UPDATE notes SET read_at=? WHERE to_user=? AND read_at IS NULL').bind(now(), user).run();
    return json({ ok: true });
  }
  if (path === '/api/together/goal' && m === 'POST') {
    const b = await body();
    const days = num(b.days, 1, 7);
    if (days === null) bad('days required');
    await setMetaStmt(db, 'joint_goal', Math.round(days)).run();
    return json({ ok: true, days: Math.round(days) });
  }

  // --- full state for the signed-in user (+ partner summary) ---
  if (path === '/api/state' && m === 'GET') {
    const date = url.searchParams.get('date');
    if (!isDate(date)) bad('date required');
    const since = addDays(date, -90);
    const [me, days, today, attempts, gateStats, errors, phrases, tests, quests, settings, mastery, partners, pDays, pSettings, pMastery, pTests, pAttempts, notes, shared, pErrors] = await db.batch([
      db.prepare('SELECT id, name FROM users WHERE id=?').bind(user),
      db.prepare('SELECT date, SUM(minutes) AS minutes FROM events WHERE user_id=? GROUP BY date ORDER BY date').bind(user),
      db.prepare("SELECT COALESCE(activity,'other') AS activity, SUM(minutes) AS minutes FROM events WHERE user_id=? AND date=? GROUP BY 1").bind(user, date),
      db.prepare('SELECT * FROM attempts WHERE user_id=? ORDER BY created_at DESC LIMIT 60').bind(user),
      db.prepare('SELECT gate_id, COUNT(*) AS clears, MAX(band) AS best_band, MAX(score) AS best_score FROM attempts WHERE user_id=? GROUP BY gate_id').bind(user),
      db.prepare('SELECT * FROM errors WHERE user_id=? ORDER BY created_at DESC LIMIT 600').bind(user),
      db.prepare('SELECT * FROM phrases WHERE user_id=? ORDER BY due, created_at').bind(user),
      db.prepare('SELECT * FROM tests WHERE user_id=? ORDER BY date, created_at').bind(user),
      db.prepare("SELECT date, ref FROM events WHERE user_id=? AND type='quest' ORDER BY date DESC LIMIT 300").bind(user),
      db.prepare('SELECT effective_from, value FROM settings WHERE user_id=? ORDER BY effective_from').bind(user),
      db.prepare('SELECT lesson_id, level, best, attempts, last_date, next_review FROM mastery WHERE user_id=?').bind(user),
      db.prepare('SELECT id, name, hash IS NOT NULL AS configured FROM users WHERE id<>?').bind(user),
      db.prepare('SELECT user_id, date, SUM(minutes) AS minutes FROM events WHERE user_id<>? AND date>=? GROUP BY user_id, date ORDER BY date').bind(user, since),
      db.prepare('SELECT user_id, effective_from, value FROM settings WHERE user_id<>? ORDER BY effective_from').bind(user),
      db.prepare('SELECT user_id, lesson_id, level, last_date FROM mastery WHERE user_id<>?').bind(user),
      db.prepare('SELECT user_id, date, source, reading, listening, writing, speaking FROM tests WHERE user_id<>? ORDER BY date').bind(user),
      db.prepare('SELECT user_id, date, gate_id, skill, exam, title, band, score, created_at FROM attempts WHERE user_id<>? ORDER BY created_at DESC LIMIT 20').bind(user),
      db.prepare('SELECT * FROM notes WHERE to_user=? OR from_user=? ORDER BY created_at DESC LIMIT 40').bind(user, user),
      db.prepare(`SELECT a.id, a.user_id, a.date, a.title, a.skill, a.exam, a.prompt, a.response, a.feedback, a.band, n.text AS note, n.created_at AS shared_at
        FROM notes n JOIN attempts a ON a.id = n.ref WHERE n.kind='share' AND (n.to_user=? OR n.from_user=?) ORDER BY n.created_at DESC LIMIT 20`).bind(user, user),
      db.prepare('SELECT user_id, category, COUNT(*) AS n FROM errors WHERE user_id<>? AND date>=? GROUP BY user_id, category ORDER BY n DESC').bind(user, addDays(date, -14)),
    ]);
    const jointGoal = Number(await getMeta(db, 'joint_goal')) || 5;
    const ai = await aiUsage(db, user);
    const parse = (rows) => rows.map((r) => ({ from: r.effective_from, ...JSON.parse(r.value) }));
    return json({
      user, name: me.results[0]?.name || user,
      days: days.results, today: today.results,
      attempts: attempts.results.map((a) => ({ ...a, feedback: a.feedback ? parseLooseJson(a.feedback) : null })),
      gateStats: gateStats.results, errors: errors.results, phrases: phrases.results, tests: tests.results, quests: quests.results,
      settings: parse(settings.results), mastery: mastery.results,
      partners: partners.results.map((p) => ({
        id: p.id, name: p.name, configured: !!p.configured,
        days: pDays.results.filter((d) => d.user_id === p.id).map((d) => ({ date: d.date, minutes: d.minutes })),
        settings: parse(pSettings.results.filter((s) => s.user_id === p.id)),
        mastery: pMastery.results.filter((x) => x.user_id === p.id).map((x) => ({ lesson_id: x.lesson_id, level: x.level, last_date: x.last_date })),
        tests: sharesScores(pSettings.results.filter((s) => s.user_id === p.id)) ? pTests.results.filter((t) => t.user_id === p.id) : [],
        recent: pAttempts.results.filter((a) => a.user_id === p.id),
        errors: sharesErrors(pSettings.results.filter((s) => s.user_id === p.id)) ? pErrors.results.filter((e) => e.user_id === p.id).map((e) => ({ category: e.category, n: e.n })) : null,
      })),
      notes: notes.results,
      shared: shared.results.map((a) => ({ ...a, feedback: a.feedback ? parseLooseJson(a.feedback) : null })),
      jointGoal,
      ai: { mine: ai.mine, total: ai.total, pool: AI_POOL, cap: AI_USER_CAP, left: Math.max(0, Math.min(AI_USER_CAP - ai.mine, AI_POOL - ai.total)) },
      owner: user === OWNER,
    });
  }

  // --- settings (history kept: each change applies from its date forward) ---
  if (path === '/api/settings' && m === 'POST') {
    const b = await body();
    if (!isDate(b.date)) bad('date required');
    const rows = await db.prepare('SELECT effective_from, value FROM settings WHERE user_id=? AND effective_from<=? ORDER BY effective_from DESC LIMIT 1').bind(user, b.date).first();
    const prev = rows ? JSON.parse(rows.value) : DEFAULT_PROFILE[user] || DEFAULT_PROFILE.arief;
    const next = validProfile(b.value || {}, prev);
    const stmts = [db.prepare('INSERT INTO settings (user_id,effective_from,value) VALUES (?,?,?) ON CONFLICT(user_id,effective_from) DO UPDATE SET value=excluded.value').bind(user, b.date, JSON.stringify(next))];
    if (str(b.name, 24)) stmts.push(db.prepare('UPDATE users SET name=? WHERE id=?').bind(str(b.name, 24), user));
    await db.batch(stmts);
    return json({ ok: true, value: next });
  }

  // --- time logs (study / drill / review) ---
  if (path === '/api/event' && m === 'POST') {
    const b = await body();
    if (!isDate(b.date)) bad('date required');
    const type = ['study', 'drill', 'review'].includes(b.type) ? b.type : 'study';
    const activity = ['grammar', 'debuff', 'speaking', 'writing', 'listening', 'phrases', 'other'].includes(b.activity) ? b.activity : 'other';
    const minutes = Math.round((num(b.minutes, 0, 180) || 0) * 10) / 10;
    if (minutes <= 0) bad('Nothing to log.');
    await eventStmt(db, user, { id: clientId(b.id), date: b.date, type, activity, minutes }).run();
    return json({ ok: true });
  }

  // --- grammar mastery: diagnostic, lesson check, spaced review, unit test ---
  if (path === '/api/mastery' && m === 'POST') {
    const b = await body();
    if (!isDate(b.date)) bad('date required');
    const kind = ['diagnostic', 'check', 'review', 'unit'].includes(b.kind) ? b.kind : 'check';
    const results = (Array.isArray(b.results) ? b.results : [{ lesson: b.lesson, score: b.score }])
      .map((r) => ({ lesson: String(r.lesson || ''), score: num(r.score, 0, 100) }))
      .filter((r) => /^[a-z0-9-]{2,40}$/.test(r.lesson) && r.score !== null)
      .slice(0, 40);
    if (!results.length) bad('No results.');
    const cur = await db.prepare(`SELECT * FROM mastery WHERE user_id=? AND lesson_id IN (${results.map(() => '?').join(',')})`).bind(user, ...results.map((r) => r.lesson)).all();
    const byId = Object.fromEntries(cur.results.map((r) => [r.lesson_id, r]));
    const stmts = []; const out = [];
    for (const r of results) {
      const c = byId[r.lesson];
      const level = nextLevel(c, r.score, kind, b.date);
      const next = level ? addDays(b.date, REVIEW_DAYS[level] || 1) : null;
      out.push({ lesson: r.lesson, from: c?.level || 0, level, next_review: next });
      stmts.push(db.prepare(`INSERT INTO mastery (user_id,lesson_id,level,best,attempts,last_date,next_review) VALUES (?,?,?,?,1,?,?)
        ON CONFLICT(user_id,lesson_id) DO UPDATE SET level=excluded.level, best=MAX(best, excluded.best), attempts=attempts+1, last_date=excluded.last_date, next_review=excluded.next_review`)
        .bind(user, r.lesson, level, r.score, b.date, next));
    }
    const minutes = Math.round((num(b.minutes, 0, 90) || 0) * 10) / 10;
    if (minutes > 0) stmts.push(eventStmt(db, user, { id: clientId(b.id), date: b.date, type: 'lesson', activity: 'grammar', minutes, ref: kind }));
    await db.batch(stmts);
    return json({ ok: true, results: out });
  }

  // --- AI-scored task ---
  if (path === '/api/gate/ai' && m === 'POST') {
    const b = await body();
    if (!isDate(b.date)) bad('date required');
    const gate = readGate(b);
    const prompt = str(b.prompt, 3500);
    const response = str(b.response, 7000);
    const words = wordCount(response);
    if (words < 8) bad('Your answer is too short to evaluate.');
    const seconds = Math.round(num(b.seconds, 0, 7200) || 0);
    const ai = await aiUsage(db, user);
    if (ai.total >= AI_POOL) bad("Today's shared AI feedback is used up. It resets at 07:00 WIB.", 429);
    if (ai.mine >= AI_USER_CAP) bad(`You've used your ${AI_USER_CAP} AI feedback requests for today. They reset at 07:00 WIB.`, 429);

    const wpm = gate.skill === 'speaking' && seconds >= 20 ? Math.round(words / (seconds / 60)) : null;
    const userMsg = [
      `TASK: ${gate.exam} - ${gate.title}`,
      `MODE: ${gate.skill}${gate.skill === 'speaking' ? ' (speech-to-text transcript)' : ''}`,
      str(b.focus, 120) ? `GRAMMAR FOCUS: ${str(b.focus, 120)}` : '',
      `TASK PROMPT:\n${prompt}`,
      str(b.note, 300) ? `EXAMINER NOTE: ${str(b.note, 300)}` : '',
      `LEARNER RESPONSE (${words} words${wpm ? `, about ${wpm} words per minute` : ''}):\n${response}`,
    ].filter(Boolean).join('\n\n');

    let fb;
    try { fb = await runAI(env, userMsg); }
    catch (e) { if (e instanceof HttpError) throw e; bad("AI feedback isn't available right now. Your answer is still on this page — try again in a moment.", 502); }

    const id = uid();
    const minutes = Math.min(60, Math.round((seconds / 60) * 10) / 10);
    const stmts = [
      setMetaStmt(db, 'ai:' + ai.day, ai.total + 1),
      setMetaStmt(db, `ai:${ai.day}:${user}`, ai.mine + 1),
      db.prepare('INSERT INTO attempts (id,user_id,date,gate_id,rank,skill,exam,title,prompt,response,feedback,band,score,seconds,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, user, b.date, gate.id, gate.rank, gate.skill, gate.exam, gate.title, prompt, response, JSON.stringify(fb), fb.band, null, seconds, now()),
      eventStmt(db, user, { date: b.date, type: 'gate', activity: gate.skill, minutes, ref: id }),
    ];
    for (const c of fb.corrections) {
      stmts.push(db.prepare('INSERT INTO errors (id,user_id,date,category,wrong,correct,explanation,skill,attempt_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(uid(), user, b.date, c.category, c.wrong, c.correct, c.explanation, gate.skill, id, now()));
    }
    for (const p of fb.phrases) {
      stmts.push(db.prepare('INSERT OR IGNORE INTO phrases (id,user_id,phrase,meaning,source,reps,interval,due,created_at) VALUES (?,?,?,?,?,0,0,?,?)')
        .bind(uid(), user, p.phrase, p.meaning, gate.title, addDays(b.date, 1), now()));
    }
    await db.batch(stmts);
    return json({ id, feedback: fb, wpm, words });
  }

  // --- device-scored task (Listen & Repeat, Build a Sentence) ---
  if (path === '/api/gate/local' && m === 'POST') {
    const b = await body();
    if (!isDate(b.date)) bad('date required');
    const gate = readGate(b);
    const score = num(b.score, 0, 100) || 0;
    const seconds = Math.round(num(b.seconds, 0, 3600) || 0);
    const minutes = Math.min(30, Math.round((seconds / 60) * 10) / 10);
    const id = uid();
    await db.batch([
      db.prepare('INSERT INTO attempts (id,user_id,date,gate_id,rank,skill,exam,title,prompt,response,feedback,band,score,seconds,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, user, b.date, gate.id, gate.rank, gate.skill, gate.exam, gate.title, '', str(b.detail, 3000), null, null, score, seconds, now()),
      eventStmt(db, user, { date: b.date, type: 'gate', activity: gate.skill, minutes, ref: id }),
    ]);
    return json({ id });
  }

  // --- phrase bank ---
  if (path === '/api/phrases' && m === 'POST') {
    const b = await body();
    const phrase = str(b.phrase, 80);
    if (!phrase || !isDate(b.date)) bad('phrase and date required');
    await db.prepare('INSERT OR IGNORE INTO phrases (id,user_id,phrase,meaning,source,reps,interval,due,created_at) VALUES (?,?,?,?,?,0,0,?,?)')
      .bind(uid(), user, phrase, str(b.meaning, 160), 'manual', b.date, now()).run();
    return json({ ok: true });
  }
  if (path === '/api/phrases/review' && m === 'POST') {
    const b = await body();
    if (!isDate(b.date)) bad('date required');
    const p = await db.prepare('SELECT reps FROM phrases WHERE id=? AND user_id=?').bind(str(b.id, 40), user).first();
    if (!p) bad('Phrase not found', 404);
    const reps = b.good ? p.reps + 1 : 0;
    const interval = b.good ? INTERVALS[Math.min(p.reps, INTERVALS.length - 1)] : 1;
    await db.prepare('UPDATE phrases SET reps=?, interval=?, due=? WHERE id=? AND user_id=?').bind(reps, interval, addDays(b.date, interval), str(b.id, 40), user).run();
    return json({ ok: true });
  }
  let mt;
  if ((mt = path.match(/^\/api\/(phrases|errors|tests)\/([\w-]{1,40})$/)) && m === 'DELETE') {
    await db.prepare(`DELETE FROM ${mt[1]} WHERE id=? AND user_id=?`).bind(mt[2], user).run();
    return json({ ok: true });
  }

  // --- checkpoints: real test results (the ONLY thing that changes skill scores) ---
  if (path === '/api/tests' && m === 'POST') {
    const b = await body();
    if (!isDate(b.date)) bad('date required');
    const s = ['reading', 'listening', 'writing', 'speaking'].map((k) => num(b[k], 0, 100));
    if (s.some((v) => v === null)) bad('All four skill scores (0-100) are required.');
    await db.prepare('INSERT INTO tests (id,user_id,date,source,reading,listening,writing,speaking,note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(uid(), user, b.date, str(b.source, 40) || 'EF SET', s[0], s[1], s[2], s[3], str(b.note, 200), now()).run();
    return json({ ok: true });
  }

  // --- partner platforms ---
  if (path === '/api/quests' && m === 'POST') {
    const b = await body();
    const key = str(b.key, 30);
    if (!isDate(b.date) || !/^[a-z0-9-]+$/.test(key)) bad('date and key required');
    await eventStmt(db, user, { id: `sq-${user}-${key}-${b.date}`, date: b.date, type: 'quest', ref: key }).run();
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
