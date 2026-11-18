// English Pathway — client app (vanilla JS, no build step). Desktop and tablet first, works on phone.
import {
  CATEGORIES, DRILLS, GATES, makeTask, CHAPTERS, PHASE_SPLIT, BLOCK_INFO, BLOCK_SHARE, LISTENING_SOURCES,
  SIDE_QUESTS, RAIDS, LEVELS as TASK_LEVELS, PLAN_TASKS, FOCUS, DAILY_PHRASES,
} from './content.js';
import { UNITS, LESSONS, LESSON, CATEGORY_LESSON } from './grammar.js';
import {
  LEVELS as MASTERY, LEVEL_HINT, diagnosticQuestions, preCheck, fullCheck, reviewQuestions, unitQuestions,
  scoreByLesson, courseState,
} from './curriculum.js';

// ================= utilities =================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtLong = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const weekday = (d) => (new Date(d + 'T00:00:00Z').getUTCDay() + 6) % 7; // Mon = 0
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const mmss = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const hm = (min) => { const m = Math.round(min); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`; };
const words = (t) => (String(t).trim().match(/\S+/g) || []).length;
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
const cefrOf = (s) => (s >= 71 ? 'C2' : s >= 61 ? 'C1' : s >= 51 ? 'B2' : s >= 41 ? 'B1' : s >= 31 ? 'A2' : s >= 21 ? 'A1' : 'A0');
const SKILLS = ['speaking', 'writing', 'reading', 'listening'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const store = {
  get: (k, d = null) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = `<div>${msg}</div>`;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'err' ? 6000 : 3800);
}

// ================= API (with retries for flaky mobile networks) =================
// One saved session per account, so both people can use the same tablet without retyping.
let TOKENS = store.get('ep_tokens', {});
let TOKEN = null;
const LEGACY = store.get('eh_token');
const saveTokens = () => store.set('ep_tokens', TOKENS);
const NET_MSG = 'Connection dropped. Check your internet and try again — nothing was lost.';
const isNetErr = (e) => e instanceof TypeError || /load failed|failed to fetch|networkerror|network connection/i.test(String(e?.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(path, opts = {}) {
  const method = opts.method || (opts.body ? 'POST' : 'GET');
  const retries = opts.retry ?? (method === 'GET' ? 2 : 0);
  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(path, {
        method, cache: 'no-store',
        headers: { 'content-type': 'application/json', ...(TOKEN ? { authorization: 'Bearer ' + TOKEN } : {}) },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      break;
    } catch (e) {
      if (!isNetErr(e)) throw e;
      if (attempt >= retries) { const err = new Error(NET_MSG); err.network = true; throw err; }
      await sleep(700 * (attempt + 1));
    }
  }
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  if (res.status === 401 && !path.startsWith('/api/auth/')) { for (const k of Object.keys(TOKENS)) if (TOKENS[k] === TOKEN) delete TOKENS[k]; saveTokens(); TOKEN = null; S = null; boot(); throw new Error('Your session expired. Sign in again.'); }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
const newId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
// Writes that matter (time logs, grammar results) queue offline and sync later.
async function send(path, body) {
  const item = { path, body: { id: newId(), ...body } };
  try { return await api(path, { body: item.body, retry: 2 }); } catch (e) {
    if (!e.network) throw e;
    store.set('ec_outbox', [...store.get('ec_outbox', []), item]);
    toast('You\'re offline. This is saved on this device and will sync automatically.');
    return null;
  }
}
async function flushOutbox() {
  const box = store.get('ec_outbox', []).map((x) => (x.path ? x : { path: '/api/event', body: x })); if (!box.length) return;
  const left = [];
  for (const it of box) { try { await api(it.path, { body: it.body, retry: 1 }); } catch (e) { if (e.network) left.push(it); } }
  store.set('ec_outbox', left);
  if (box.length !== left.length) toast(`Synced ${box.length - left.length} saved item${box.length - left.length > 1 ? 's' : ''}.`);
}

// ================= profile, phases, derived state =================
const GATE = Object.fromEntries(GATES.map((g) => [g.id, g]));
let S = null;
let VIEW = 'home';
let SUB = {};
let RUN = null;

const profileFor = (date, rows = S.settings) => {
  let p = rows[0] || {};
  for (const r of rows) if (r.from <= date) p = r;
  return p;
};
function phaseOf(date, prof) {
  const span = Math.max(1, daysBetween(prof.start, prof.end));
  const f = Math.min(0.999, Math.max(0, daysBetween(prof.start, date) / span));
  const i = PHASE_SPLIT.findIndex((x, k) => f >= x && f < PHASE_SPLIT[k + 1]);
  const n = Math.max(0, i);
  return { ...CHAPTERS[n], n: n + 1, start: addDays(prof.start, Math.round(PHASE_SPLIT[n] * span)), end: addDays(prof.start, Math.round(PHASE_SPLIT[n + 1] * span) - 1) };
}
function blocksFor(date, prof) {
  const shares = (BLOCK_SHARE[prof.focus] || BLOCK_SHARE.default)[phaseOf(date, prof).n - 1];
  const out = {}; let sum = 0;
  for (const [k, v] of Object.entries(shares)) { out[k] = Math.max(5, Math.round((prof.daily * v) / 5) * 5); sum += out[k]; }
  out.speaking += prof.daily - sum; // keep the total exact
  return out;
}
function streakOf(dayMap, rows, t) {
  const ok = (d) => (dayMap[d] || 0) >= profileFor(d, rows).minimum;
  const rest = (d) => (profileFor(d, rows).restDays || []).includes(weekday(d));
  let streak = 0; let d = ok(t) ? t : addDays(t, -1);
  for (let i = 0; i < 400; i++) { if (ok(d)) streak++; else if (!rest(d)) break; d = addDays(d, -1); }
  return streak;
}
function derive() {
  const t = today();
  const prof = profileFor(t);
  const phase = phaseOf(t, prof);
  const dayMap = Object.fromEntries(S.days.map((d) => [d.date, d.minutes]));
  const todayMin = S.today.reduce((a, r) => a + (r.minutes || 0), 0);
  const actMin = Object.fromEntries(S.today.map((r) => [r.activity, r.minutes]));
  const streak = streakOf(dayMap, S.settings, t);
  let best = 0;
  if (S.days.length) {
    let d = S.days[0].date, run = 0;
    while (d <= t) {
      const p = profileFor(d);
      if ((dayMap[d] || 0) >= p.minimum) { run++; best = Math.max(best, run); } else if (!(p.restDays || []).includes(weekday(d))) run = 0;
      d = addDays(d, 1);
    }
  }
  const fullDays = S.days.filter((x) => x.minutes >= profileFor(x.date).daily).length;
  const totalMin = S.days.reduce((a, x) => a + (x.minutes || 0), 0);
  const monday = addDays(t, -weekday(t));
  const weekMin = S.days.filter((x) => x.date >= monday && x.date <= t).reduce((a, x) => a + (x.minutes || 0), 0);
  const weekTarget = prof.daily * (7 - (prof.restDays || []).length);
  const real = S.tests.filter((x) => x.source !== 'Estimate');
  const base = real[0] || S.tests[0] || null;
  const latest = S.tests[S.tests.length - 1] || null;
  const estimateOnly = !real.length && !!latest;
  let gapTotal = 0, gapLeft = 0;
  if (base) for (const k of SKILLS) {
    const tgt = prof.targets[k], cur = latest[k];
    if (tgt > base[k]) { gapTotal += tgt - base[k]; gapLeft += Math.max(0, tgt - cur); } else if (cur < tgt) gapLeft += tgt - cur;
  }
  const gapPct = !base ? null : gapTotal ? Math.max(0, Math.min(100, Math.round(((gapTotal - gapLeft) / gapTotal) * 100))) : 100;
  const cut = addDays(t, -13);
  const cats = {};
  for (const e of S.errors) {
    const c = (cats[e.category] ||= { key: e.category, recent: 0, total: 0, examples: [] });
    c.total++; if (e.date >= cut) c.recent++;
    if (c.examples.length < 3) c.examples.push(e);
  }
  const patterns = Object.values(cats).filter((c) => c.recent > 0).sort((a, b) => b.recent - a.recent);
  const cleared = Object.values(cats).filter((c) => c.recent === 0);
  const due = S.phrases.filter((p) => p.due <= t);
  // estimated bands by criterion (last 6 AI tasks per skill) — estimates, never skill scores
  const crit = {};
  for (const sk of ['speaking', 'writing']) {
    const recent = S.attempts.filter((a) => a.skill === sk && a.feedback?.band).slice(0, 6);
    const c = (k) => avg(recent.map((a) => a.feedback?.criteria?.[k]).filter((v) => v));
    crit[sk] = { n: recent.length, band: avg(recent.map((a) => a.feedback.band)), task: c('task'), coherence: c('coherence'), lexical: c('lexical'), grammar: c('grammar') };
  }
  const course = courseState(S.mastery, prof, t);
  const nextCheck = RAIDS.find((r) => r.date >= t) || null;
  return { t, prof, phase, blocks: blocksFor(t, prof), dayMap, todayMin, actMin, streak, best, fullDays, totalMin, monday, weekMin, weekTarget, base, latest, estimateOnly, gapPct, gapLeft, patterns, cleared, due, crit, course, nextCheck };
}
function partnerView(p) {
  const t = today();
  const dayMap = Object.fromEntries(p.days.map((d) => [d.date, d.minutes]));
  const rows = p.settings.length ? p.settings : [{ daily: 60, minimum: 20, restDays: [] }];
  const monday = addDays(t, -weekday(t));
  const weekMin = p.days.filter((x) => x.date >= monday).reduce((a, x) => a + x.minutes, 0);
  const prof = profileFor(t, rows);
  const levels = Object.fromEntries((p.mastery || []).map((m) => [m.lesson_id, m.level]));
  const learned = Object.values(levels).filter((v) => v >= 2).length;
  const last = p.days.length ? p.days[p.days.length - 1].date : null;
  return { ...p, dayMap, rows, prof, levels, streak: streakOf(dayMap, rows, t), weekMin, weekTarget: prof.daily * (7 - (prof.restDays || []).length), todayMin: dayMap[t] || 0, daily: prof.daily, minimum: prof.minimum, learned, last };
}
function milestones(D) {
  const n = S.attempts.length;
  const ov = D.latest && !D.estimateOnly ? (D.latest.reading + D.latest.listening + D.latest.writing + D.latest.speaking) / 4 : 0;
  const hrs = D.totalMin / 60;
  const bb = Math.max(...S.attempts.map((a) => a.band || 0), 0);
  const C = D.course;
  return [
    ['Diagnostic done', 'Take the grammar diagnostic', C.diagnosed],
    ['First session', 'Complete one practice task', n >= 1],
    ['First full day', 'Reach your daily target once', D.fullDays >= 1],
    ['One week steady', '7-day streak', D.best >= 7],
    ['One month steady', '30-day streak', D.best >= 30],
    ['First unit', 'Pass a unit test', C.units.some((u) => u.passed)],
    ['Half the course', 'Learn 10 grammar lessons', C.learned >= 10],
    ['Course complete', 'All lessons Proficient', C.proficient >= LESSONS.length],
    ['Five mastered', 'Master 5 lessons', C.mastered >= 5],
    ['25 hours', '25 hours trained', hrs >= 25],
    ['100 hours', '100 hours trained', hrs >= 100],
    ['Band 6.0', 'Estimated band 6.0 on a task', bb >= 6],
    ['Band 6.5', 'Estimated band 6.5 on a task', bb >= 6.5],
    ['Band 7.0', 'Estimated band 7.0 on a task', bb >= 7],
    ['Pattern fixed', 'An error pattern gone for 14 days', D.cleared.length >= 1],
    ['First checkpoint', 'Record your own test result', S.tests.filter((x) => x.source !== 'Estimate').length >= (D.estimateOnly ? 1 : 2)],
    ['C1 overall', 'Overall 61+ on a real test', ov >= 61],
  ].map(([name, desc, got]) => ({ name, desc, got }));
}

function planTasks(D) {
  const idx = Math.max(0, daysBetween(D.prof.start, D.t));
  const byFocus = PLAN_TASKS[D.prof.focus] || PLAN_TASKS['ielts-gt'];
  const p = byFocus[D.phase.n];
  return { speaking: GATE[p.speaking[idx % p.speaking.length]], writing: GATE[p.writing[idx % p.writing.length]] };
}

// Ordered steps for today — the single source for "Next step".
function planSteps(D) {
  const C = D.course; const tasks = planTasks(D); const B = D.blocks; const done = (k) => D.actMin[k] || 0;
  const focus = C.current ? C.current.title : null;
  const steps = [];
  if (!C.diagnosed) steps.push({ key: 'diagnostic', block: 'grammar', title: 'Take the grammar diagnostic', why: '38 quick questions, about 12 minutes. It finds which lessons you already know, so you don\'t study them again.', mins: 12, done: false, action: { type: 'diagnostic' } });
  C.due.slice(0, 2).forEach((l) => steps.push({ key: 'rev-' + l.id, block: 'grammar', title: `Review · ${l.title}`, why: 'Spaced review keeps a rule in long-term memory. 3 questions.', mins: 3, done: false, action: { type: 'review', id: l.id } }));
  if (C.unitTest) steps.push({ key: 'unit', block: 'grammar', title: `Unit test · ${C.unitTest.name}`, why: 'Mixed questions from the whole unit. 100% on a lesson here moves it to Mastered.', mins: 8, done: false, action: { type: 'unit', id: C.unitTest.id } });
  if (C.current) steps.push({ key: 'lesson', block: 'grammar', title: `${C.level(C.current.id) === 0 ? 'Learn' : 'Finish'} · ${C.current.title}`, why: 'Pre-check → read the rules → quick check. 80% or more moves you on.', mins: C.current.mins, done: done('grammar') >= B.grammar, action: { type: 'lesson', id: C.current.id } });
  steps.push({ key: 'drill', block: 'debuff', title: 'Error drill · your top patterns', why: 'Short quiz on the mistakes that appear most in your answers.', mins: B.debuff, done: done('debuff') >= B.debuff, action: { type: 'drill' } });
  steps.push({ key: 'speak', block: 'speaking', title: `Speaking · ${tasks.speaking.title}`, why: focus ? `Use today's grammar (${focus}). The feedback checks it.` : 'Record, read the feedback, then shadow the improved version.', mins: B.speaking, done: done('speaking') >= B.speaking, action: { type: 'task', id: tasks.speaking.id, focus } });
  steps.push({ key: 'write', block: 'writing', title: `Writing · ${tasks.writing.title}`, why: focus ? `Use today's grammar (${focus}). Rewrite one corrected sentence from memory.` : 'Write, read the feedback, then rewrite one corrected sentence from memory.', mins: B.writing, done: done('writing') >= B.writing, action: { type: 'task', id: tasks.writing.id, focus } });
  steps.push({ key: 'listen', block: 'listening', title: 'Listening and shadowing', why: 'Listen once for meaning, then repeat sentence by sentence.', mins: B.listening, done: done('listening') >= B.listening, action: { type: 'timer', id: 'listening' } });
  steps.push({ key: 'phrases', block: 'phrases', title: `Phrase review${D.due.length ? ` · ${D.due.length} due` : ''}`, why: 'Say each phrase in your own sentence.', mins: B.phrases, done: done('phrases') >= B.phrases || !D.due.length, action: { type: 'phrases' } });
  return steps;
}
function runStep(step) {
  const a = step.action;
  if (a.type === 'diagnostic') return startDiagnostic();
  if (a.type === 'review') return startQuiz({ kind: 'review', title: `Review · ${LESSON[a.id].title}`, questions: reviewQuestions(LESSON[a.id]) });
  if (a.type === 'unit') { const u = UNITS.find((x) => x.id === a.id); return startQuiz({ kind: 'unit', title: `Unit test · ${u.name}`, questions: unitQuestions(u.id) }); }
  if (a.type === 'lesson') return openLesson(a.id);
  if (a.type === 'drill') { const keys = derive().patterns.map((c) => c.key).filter((k) => DRILLS[k]).slice(0, 4); return startDrill(keys.length ? keys : ['article', 'verb_form', 'preposition']); }
  if (a.type === 'task') return startTask(GATE[a.id], a.focus);
  if (a.type === 'timer') { go('today'); return startTimer(a.id); }
  if (a.type === 'phrases') { const D = derive(); if (D.due.length) { RUN = phraseRunner(D.due); render(); } else { SUB.review = 'phrases'; go('review'); } }
}

// ================= speech =================
let VOICE = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
  VOICE = vs.find((v) => /en[-_]GB/i.test(v.lang) && /(natural|premium|enhanced|google)/i.test(v.name))
    || vs.find((v) => /(natural|premium|enhanced|google)/i.test(v.name))
    || vs.find((v) => /en[-_]GB/i.test(v.lang)) || vs.find((v) => /en[-_]US/i.test(v.lang)) || vs[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text, rate = 0.95) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { toast('Text-to-speech isn\'t available in this browser.', 'err'); return resolve(); }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (VOICE) u.voice = VOICE;
    u.lang = VOICE?.lang || 'en-GB'; u.rate = rate;
    u.onend = resolve; u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
class Recorder {
  constructor(onText, onState) { this.onText = onText; this.onState = onState || (() => {}); this.active = false; }
  static supported() { return !!SR; }
  start(prefix = '') {
    if (!SR) { toast('Voice input isn\'t supported here. Tap the text box and use your keyboard\'s microphone instead.', 'err'); return false; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    this.prefix = prefix ? prefix.trimEnd() + ' ' : '';
    this.base = ''; this.final = ''; this.interim = ''; this.active = true; this.t0 = Date.now();
    setTimeout(() => this._spawn(), 250);
    this.onState(true);
    return true;
  }
  _spawn() {
    if (!this.active) return;
    const r = new SR();
    r.lang = 'en-US'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) this.final += txt.trim() + ' '; else interim += txt;
      }
      this.interim = interim; this.onText(this.text());
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.active = false; this.onState(false);
        toast('Microphone access was blocked. On iPhone: Settings › Safari › Microphone › Allow, and keep Siri on. Keyboard dictation also works.', 'err');
      }
    };
    r.onend = () => {
      this.base += this.final + (this.interim ? this.interim.trim() + ' ' : '');
      this.final = ''; this.interim = '';
      if (this.active) setTimeout(() => this._spawn(), 200); else { this.onText(this.text()); this.onState(false); }
    };
    this.rec = r;
    try { r.start(); } catch { /* already started */ }
  }
  text() { return (this.prefix + this.base + this.final + this.interim).replace(/\s+/g, ' ').trimStart(); }
  stop() { const secs = (Date.now() - (this.t0 || Date.now())) / 1000; this.active = false; try { this.rec?.stop(); } catch { /* ignore */ } return secs; }
}

// ================= icons =================
const ICON = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  today: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  learn: '<path d="M2 7l10-4 10 4-10 4z"/><path d="M6 9v5c0 2 3 3.5 6 3.5s6-1.5 6-3.5V9"/>',
  practice: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  review: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 8h6"/>',
  progress: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  together: '<circle cx="8.5" cy="8" r="3.2"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M2.5 19c.6-3.3 3-5 6-5s5.4 1.7 6 5M14.5 14.6c2.9-.4 5.6 1.1 6.5 4.4"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  grammar: '<path d="M4 19V6a2 2 0 0 1 2-2h12v13H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h12"/><path d="M9 8h5M9 11h3"/>',
  debuff: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.8"/>',
  speaking: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  writing: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  listening: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  phrases: '<path d="M5 5h14v10H9l-4 4z"/><path d="M9 9h6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  play: '<path d="M8 5.5v13l10-6.5z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
const NAV = [['home', 'Home'], ['today', 'Today'], ['learn', 'Learn'], ['practice', 'Practice'], ['review', 'Review'], ['together', 'Together'], ['progress', 'Progress']];
const PHONE_NAV = [['home', 'Home'], ['today', 'Today'], ['learn', 'Learn'], ['practice', 'Practice'], ['together', 'Together'], ['more', 'More']];
// Skill colours: one soft tint per skill so the plan is easy to scan
const BLOCK_SKILL = { grammar: 'grammar', debuff: 'debuff', speaking: 'speaking', writing: 'writing', listening: 'listening', phrases: 'phrases', reading: 'reading' };
const kicon = (k) => `<span class="kicon k-${BLOCK_SKILL[k] || 'grammar'}">${icon(ICON[k] ? k : 'grammar')}</span>`;
function ring(pct, size = 64, stroke = 6, inner = '', cls = '') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, pct));
  return `<svg class="ring ${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" class="ring-bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round" class="ring-fg" stroke-dasharray="${(c * v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>${inner ? `<text x="50%" y="50%" dy="0.35em" text-anchor="middle" class="ring-txt">${inner}</text>` : ''}</svg>`;
}
const wibDate = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(iso));
const phraseOfDay = (d = today()) => DAILY_PHRASES[Math.abs(daysBetween('2026-01-01', d)) % DAILY_PHRASES.length];

// ================= boot / auth =================
async function boot() {
  document.body.classList.remove('authed');
  document.body.classList.add('on-cover');
  // Use any saved session to unlock the streaks on the cover (and to adopt an old single-account session).
  TOKEN = Object.values(TOKENS)[0] || LEGACY || null;
  let status;
  try { status = await api('/api/auth/status?date=' + today()); }
  catch (e) { $('#app').innerHTML = `<div class="auth"><div class="card"><h2>Can't connect</h2><p class="muted">${esc(e.message)}</p><p class="small muted">On XL mobile data, turn on Private DNS (one.one.one.one) or use WiFi.</p><button class="btn" onclick="location.reload()">Try again</button></div></div>`; return; }
  if (LEGACY && status.signedInAs && !TOKENS[status.signedInAs]) { TOKENS[status.signedInAs] = LEGACY; saveTokens(); }
  if (LEGACY) store.del('eh_token');
  if (!status.signedInAs) { TOKENS = {}; saveTokens(); }
  TOKEN = null;
  renderCover(status);
}
function coverStats(u) {
  if (!u.days || !u.settings?.length) return null;
  const t = today();
  const dayMap = Object.fromEntries(u.days.map((d) => [d.date, d.minutes]));
  const prof = profileFor(t, u.settings);
  return { dayMap, prof, todayMin: dayMap[t] || 0, streak: streakOf(dayMap, u.settings, t) };
}
function renderCover(status, chosen = null, msg = '') {
  const t = today(); const users = status.users;
  const ph = phraseOfDay(t);
  const next = RAIDS.find((r) => r.date >= t);
  const stats = Object.fromEntries(users.map((u) => [u.id, coverStats(u)]));
  const both = users.every((u) => stats[u.id]);
  const monday = addDays(t, -weekday(t));
  const together = both ? DAY_NAMES.map((n, i) => {
    const d = addDays(monday, i);
    const met = users.filter((u) => (stats[u.id].dayMap[d] || 0) >= profileFor(d, u.settings).minimum).length;
    return { n, d, met };
  }) : null;
  const togetherDays = together ? together.filter((x) => x.met === users.length).length : 0;
  $('#app').innerHTML = `<div class="cover">
    <section class="cover-intro">
      <div class="brand"><span class="brand-mark"><i></i></span>English Pathway</div>
      <h1 class="cover-title">${greeting()}.<br><span class="muted">Who's studying today?</span></h1>
      <p class="cover-sub">${fmtLong(t)}${next ? ` · ${daysBetween(t, next.date)} days to ${esc(next.name)}` : ''}</p>
    </section>
    <section class="cover-extra">
      <div class="card ink phrase-card">
        <span class="label">Phrase of the day</span>
        <div class="phrase-big">${esc(ph.p)}</div>
        <p class="small muted" style="margin:0 0 14px">${esc(ph.tip)}</p>
        <button class="btn on-ink sm" id="cv-say">${icon('play')}Listen</button>
      </div>
      <div class="cover-feats">
        <div>${kicon('grammar')}<b>${LESSONS.length} grammar lessons</b><span>Short rules, quick checks, spaced reviews</span></div>
        <div>${kicon('speaking')}<b>Speaking and writing</b><span>IELTS, TOEFL and interview tasks with AI feedback</span></div>
        <div>${kicon('phrases')}<b>Your own mistakes</b><span>Every error becomes a drill until it's gone</span></div>
      </div>
    </section>
    <section class="cover-side">
      <span class="label">Choose your account</span>
      <div class="cover-users">${users.map((u) => {
        const st = stats[u.id]; const open = chosen === u.id;
        const saved = !!TOKENS[u.id];
        const sub = !u.configured ? (u.id === 'arief' ? 'Set up your passphrase' : 'Arief sets the first passphrase in his Settings')
          : st ? `${st.streak}-day streak · ${Math.round(st.todayMin)} of ${st.prof.daily} min today` : saved ? 'Signed in on this device' : 'Sign in';
        return `<div class="user-tile ${open ? 'open' : ''} ${!u.configured && u.id !== 'arief' ? 'waiting' : ''}">
          <button class="user-head" data-user="${u.id}">
            ${st ? ring(st.todayMin / Math.max(1, st.prof.daily), 58, 6, esc(u.name[0]), 'ring-' + u.id) : `<span class="avatar lg">${esc(u.name[0])}</span>`}
            <span class="user-meta"><b>${esc(u.name)}</b><span class="small muted">${sub}</span></span>
            <span class="go-arrow">${icon(saved ? 'arrow' : u.configured ? 'lock' : 'arrow')}</span>
          </button>
          ${open ? `<div class="user-pass">
            ${msg ? `<p class="small down" style="margin:0 0 8px">${esc(msg)}</p>` : ''}
            <label for="a-pass">${u.configured ? 'Passphrase' : 'Create a passphrase (8+ characters)'}</label>
            <input id="a-pass" type="password" autocomplete="${u.configured ? 'current-password' : 'new-password'}" />
            ${u.configured ? '' : '<label for="a-pass2">Confirm passphrase</label><input id="a-pass2" type="password" autocomplete="new-password" />'}
            <button id="a-go" class="btn full mt">${u.configured ? `Continue as ${esc(u.name)}` : 'Create and continue'}</button>
            <p class="xs muted" style="margin:8px 0 0">You stay signed in on this device until you sign out.</p>
          </div>` : ''}
        </div>`;
      }).join('')}</div>
      ${together ? `<div class="card together-strip">
        <div class="row between"><span class="label">This week together</span><span class="small"><b class="w5">${togetherDays}</b> of 7 days both studied</span></div>
        <div class="tg-days">${together.map((x) => `<span class="m${x.met} ${x.d === t ? 'today' : ''} ${x.d > t ? 'future' : ''}" title="${fmtDate(x.d)}">${x.n[0]}</span>`).join('')}</div>
        <div class="legend"><span><i class="lg2"></i>Both</span><span><i class="lg1"></i>One of you</span><span><i class="lg0"></i>Not yet</span></div>
      </div>` : `<p class="xs muted">Sign in once on this device to see both streaks here.</p>`}
    </section>
  </div>`;
  $('#cv-say').onclick = () => speak(ph.p.replace(/…/g, ''));
  $$('[data-user]').forEach((b) => (b.onclick = () => enterAs(status, b.dataset.user)));
  if (!chosen) return;
  const u = users.find((x) => x.id === chosen);
  $('#a-pass')?.focus();
  const goAuth = async () => {
    const pass = $('#a-pass').value;
    try {
      let r;
      if (!u.configured) {
        if (pass !== $('#a-pass2').value) return toast('Passphrases don\'t match.', 'err');
        r = await api('/api/auth/setup', { body: { user: u.id, passphrase: pass } });
      } else r = await api('/api/auth/login', { body: { user: u.id, passphrase: pass } });
      TOKENS[u.id] = r.token; saveTokens();
      enterAs(status, u.id);
    } catch (e) { toast(esc(e.message), 'err'); }
  };
  $('#a-go').onclick = goAuth;
  $('#a-pass').onkeydown = (e) => { if (e.key === 'Enter' && u.configured) goAuth(); };
}
async function enterAs(status, id) {
  const u = status.users.find((x) => x.id === id);
  if (!u) return;
  if (!u.configured && u.id !== 'arief') return toast(`${esc(u.name)}'s account isn't ready yet. Arief sets the first passphrase in Settings › Study partner.`, 'err');
  if (!TOKENS[id]) return renderCover(status, id);
  TOKEN = TOKENS[id];
  try { S = null; PREV = null; await refresh(); }
  catch (e) { if (!TOKENS[id]) return renderCover(status, id, 'Please sign in again.'); TOKEN = null; return toast(esc(e.message), 'err'); }
  VIEW = 'home'; RUN = null; SUB = {};
  document.body.classList.remove('on-cover');
  document.body.classList.add('authed');
  renderShell(); render(); window.scrollTo(0, 0);
}
let PREV = null;
async function refresh() {
  await flushOutbox();
  S = await api('/api/state?date=' + today());
  const D = derive();
  const got = milestones(D).filter((m) => m.got).map((m) => m.name);
  if (PREV && PREV.user === S.user) {
    got.filter((n) => !PREV.ms.includes(n)).forEach((n) => toast(`Milestone reached: <b style="font-weight:500">${esc(n)}</b>`, 'good'));
    if (PREV.todayMin < D.prof.daily && D.todayMin >= D.prof.daily) toast('Daily target reached. Well trained.', 'good');
    else if (PREV.todayMin < D.prof.minimum && D.todayMin >= D.prof.minimum) toast(`${D.prof.minimum} minutes done — your streak is safe today.`);
  }
  PREV = { user: S.user, todayMin: D.todayMin, ms: got };
}

// ================= shell (sidebar + main + right rail) =================
function renderShell() {
  const unread = (S.notes || []).filter((n) => n.to_user === S.user && !n.read_at).length;
  const badge = (k) => (k === 'together' && unread ? `<span class="badge">${unread}</span>` : '');
  $('#side').innerHTML = `
    <div class="brand"><span class="brand-mark"><i></i></span>English Pathway</div>
    <nav class="side-nav">${NAV.map(([k, l]) => `<button data-view="${k}">${icon(k)}<span>${l}</span>${badge(k)}</button>`).join('')}</nav>
    <div class="side-foot">
      <button data-view="settings" class="side-user"><span class="avatar">${esc(S.name[0] || '?')}</span><span><b>${esc(S.name)}</b><span class="xs muted">Settings</span></span></button>
      <button class="side-switch" id="sw-acc">Switch account</button>
    </div>`;
  $('#topbar').innerHTML = `<div class="brand"><span class="brand-mark"><i></i></span>English Pathway</div><button class="icon-btn" data-view="settings" aria-label="Settings"><span class="avatar sm">${esc(S.name[0] || '?')}</span></button>`;
  $('#nav').innerHTML = PHONE_NAV.map(([k, l]) => `<button data-view="${k}">${icon(k)}${l}${badge(k)}</button>`).join('');
  $$('[data-view]').forEach((b) => (b.onclick = () => { if (!leaveOk()) return; RUN = null; if ('speechSynthesis' in window) speechSynthesis.cancel(); go(b.dataset.view); }));
  $('#sw-acc').onclick = switchAccount;
}
function switchAccount() { if (!leaveOk()) return; RUN = null; S = null; TOKEN = null; boot(); }
const leaveOk = () => !RUN || RUN.done || confirm('Leave this task? Your answer here won\'t be saved.');
function go(view) { VIEW = view; keyHandler = null; render(); window.scrollTo(0, 0); }
function render() {
  if (!S) return;
  $$('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === (RUN?.view || VIEW) || (b.dataset.view === 'more' && ['review', 'progress', 'settings'].includes(RUN?.view || VIEW))));
  const D = derive();
  renderRail(D);
  if (RUN) return RUN.render();
  const views = { home: vHome, today: vToday, learn: vLearn, practice: vPractice, review: vReview, together: vTogether, progress: vProgress, settings: vSettings, more: vMore };
  (views[VIEW] || vHome)(D);
  bindCommon();
}
function bindCommon() {
  $$('[data-go]').forEach((b) => (b.onclick = (e) => { e.preventDefault(); if (b.dataset.sub) SUB[b.dataset.go] = b.dataset.sub; go(b.dataset.go); }));
  $$('[data-start]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); startTask(GATE[b.dataset.start], b.dataset.focus || null); }));
  $$('[data-lesson]').forEach((b) => (b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openLesson(b.dataset.lesson); }));
  $$('[data-step]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const st = planSteps(derive()).find((x) => x.key === b.dataset.step); if (st) runStep(st); }));
  $$('[data-say]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); speak(b.dataset.say); }));
}

function nextStepCard(D, compact = false) {
  const steps = planSteps(D); const next = steps.find((s) => !s.done);
  const doneN = steps.filter((s) => s.done).length;
  return `<div class="card ink next-card">
    <div class="card-head"><span class="label">Next step</span><span class="pill">${doneN} of ${steps.length} done</span></div>
    ${next ? `<div class="row" style="align-items:flex-start;gap:12px">${kicon(next.block)}<div style="min-width:0"><h3 class="next-title">${esc(next.title)}</h3><p class="small muted" style="margin:4px 0 0">${esc(next.why)}</p></div></div>
      <button class="btn on-ink full mt" data-step="${next.key}">Start · about ${next.mins} min</button>`
    : '<h3 class="next-title">Today is complete</h3><p class="small muted">Anything extra is a bonus. Try a full mock in Practice.</p>'}
    ${compact ? '' : `<div class="bar mt"><i style="width:${Math.min(100, (D.todayMin / D.prof.daily) * 100)}%"></i><span class="mark" style="left:${(D.prof.minimum / D.prof.daily) * 100}%"></span></div>
    <div class="row between xs muted mt"><span>${Math.round(D.todayMin)} of ${D.prof.daily} min today</span><span>${D.streak}-day streak</span></div>`}
  </div>`;
}
function partnerCard() {
  const ps = (S.partners || []).filter((p) => p.configured).map(partnerView);
  if (!ps.length) return '';
  return ps.map((p) => `<div class="card partner-mini">
    <div class="card-head"><span class="label">Study partner</span><span class="xs dim">${p.last ? (p.last === today() ? 'active today' : 'last active ' + fmtDate(p.last)) : 'not started yet'}</span></div>
    <div class="row" style="gap:14px">${ring(p.todayMin / Math.max(1, p.daily), 56, 6, esc(p.name[0]), 'ring-partner')}
      <div><b class="w5">${esc(p.name)}</b><div class="small muted">${p.streak}-day streak · ${Math.round(p.todayMin)} of ${p.daily} min</div><div class="xs muted">${p.learned} of ${LESSONS.length} lessons learned</div></div></div>
    <div class="row mt wrap"><button class="btn sm" data-cheer="${p.id}">${icon('heart')}Cheer</button><button class="btn sm ghost" data-go="together">Together</button></div>
  </div>`).join('');
}
async function sendCheer(to, text = '', kind = 'cheer', ref = null) {
  try { await api('/api/notes', { body: { to, kind, text, ref } }); toast(kind === 'share' ? 'Shared with your partner.' : kind === 'cheer' ? 'Cheer sent.' : 'Note sent.', 'good'); await refresh(); render(); }
  catch (e) { toast(esc(e.message), 'err'); }
}
function renderRail(D) {
  const onHome = VIEW === 'home' && !RUN;
  $('#rail').innerHTML = `${onHome ? '' : nextStepCard(D)}
    <div class="card"><div class="card-head"><span class="label">This week</span><span class="xs dim">${hm(D.weekMin)} of ${hm(D.weekTarget)}</span></div>
      <div class="bar"><i style="width:${Math.min(100, (D.weekMin / Math.max(1, D.weekTarget)) * 100)}%"></i></div>
      <div class="week-days mt">${DAY_NAMES.map((n, i) => { const d = addDays(D.monday, i); const m = D.dayMap[d] || 0; const p = profileFor(d); const rest = (p.restDays || []).includes(i); return `<span class="${d > D.t ? 'future' : m >= p.daily ? 'full' : m >= p.minimum ? 'ok' : rest ? 'rest' : ''} ${d === D.t ? 'today' : ''}" title="${fmtDate(d)} · ${Math.round(m)} min">${n[0]}</span>`; }).join('')}</div>
      <div class="row between xs muted mt"><span>${D.streak}-day streak</span><span>best ${D.best}</span></div>
    </div>
    ${onHome || VIEW === 'together' ? '' : partnerCard()}
    <div class="card"><div class="row between"><span class="label">AI feedback left today</span><b class="w5">${S.ai.left}</b></div><p class="xs muted" style="margin:6px 0 0">Shared pool of ${S.ai.pool} a day, up to ${S.ai.cap} each. Resets at 07:00 WIB.</p></div>`;
  bindRail();
}
function bindRail() {
  $$('#rail [data-step]').forEach((b) => (b.onclick = () => { const st = planSteps(derive()).find((x) => x.key === b.dataset.step); if (st && leaveOk()) runStep(st); }));
  $$('#rail [data-cheer]').forEach((b) => (b.onclick = () => sendCheer(b.dataset.cheer)));
  $$('#rail [data-go]').forEach((b) => (b.onclick = () => { if (leaveOk()) { RUN = null; go(b.dataset.go); } }));
}
const pageHead = (label, title) => `<div class="page-head"><span class="label"><span class="dot"></span>${label}</span><h1>${title}</h1></div>`;
const greeting = () => { const h = +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date()); return h < 11 ? 'Good morning' : h < 15 ? 'Good afternoon' : 'Good evening'; };

// ================= HOME =================
function heatmap(D, weeks = 8) {
  const start = addDays(D.monday, -7 * (weeks - 1));
  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i); const m = D.dayMap[d] || 0; const p = profileFor(d);
    const cls = d > D.t ? 'future' : m >= p.daily ? 'l3' : m >= p.minimum ? 'l2' : m > 0 ? 'l1' : '';
    cells += `<i class="${cls} ${d === D.t ? 'today' : ''}" title="${fmtDate(d)} · ${Math.round(m)} min"></i>`;
  }
  return `<div class="heat wk" style="grid-template-columns:repeat(${weeks},1fr)">${cells}</div>
  <div class="legend"><span><i style="background:var(--sky-soft)"></i>Started</span><span><i style="background:var(--sky)"></i>Streak minimum</span><span><i style="background:var(--ink)"></i>Daily target</span></div>`;
}
function critRow(label, v) {
  return `<div class="crit"><span>${label}</span><div class="bar"><i style="width:${v ? (v / 9) * 100 : 0}%"></i></div><b>${v ? v.toFixed(1) : '–'}</b></div>`;
}
const STEP_LABEL = (x) => ({ diagnostic: 'Grammar diagnostic', unit: 'Unit test', lesson: 'Grammar lesson', drill: 'Error drill', speak: 'Speaking', write: 'Writing', listen: 'Listening', phrases: 'Phrase review' }[x.key] || (x.key.startsWith('rev-') ? 'Lesson review' : x.title));
function unitStatus(C, u) {
  if (u.passed) return 'done';
  if (u.lessons.some((l) => l.id === C.current?.id)) return 'now';
  if (u.lessons.some((l) => C.level(l.id) >= 2)) return 'started';
  return 'later';
}
function pathTrack(D) {
  const C = D.course;
  const nodes = C.units.map((u, i) => ({ name: u.name, st: unitStatus(C, u), n: i + 1, done: u.done, total: u.lessons.length }));
  let firstNow = nodes.findIndex((x) => x.st === 'now');
  if (firstNow < 0) firstNow = nodes.findIndex((x) => x.st !== 'done');
  return `<div class="path">${nodes.map((x, i) => `<div class="path-node ${x.st} ${i === firstNow ? 'here' : ''}" data-go="learn" title="${esc(x.name)} · ${x.done} of ${x.total} proficient">
      <span class="dotn">${x.st === 'done' ? icon('check') : x.n}</span><span class="pname">${esc(x.name)}</span><span class="pmeta">${x.done}/${x.total}</span></div>`).join('')}
    <div class="path-node flag"><span class="dotn">${icon('flag')}</span><span class="pname">Final check</span><span class="pmeta">${fmtDate(D.prof.end)}</span></div></div>`;
}
function skillTiles(D) {
  return `<div class="skill-tiles">${SKILLS.map((k) => {
    const v = D.latest?.[k]; const tg = D.prof.targets[k];
    const met = v != null && v >= tg;
    return `<div class="stile k-${k}"><div class="stile-top">${icon(k === 'reading' ? 'grammar' : k)}<span>${cap(k)}</span></div>
      <div class="stile-v">${v != null ? `${v}${met ? ' <span class="xs">target met</span>' : ` <span class="arrow">→</span> ${tg}`}` : '–'}</div>
      <div class="stile-bar"><i style="width:${v != null ? Math.min(100, (v / Math.max(1, tg)) * 100) : 0}%"></i></div></div>`;
  }).join('')}</div>`;
}
function vHome(D) {
  const C = D.course;
  const steps = planSteps(D); const next = steps.find((x) => !x.done); const doneN = steps.filter((x) => x.done).length;
  const partner = (S.partners || []).filter((p) => p.configured).map(partnerView)[0];
  const unread = (S.notes || []).filter((n) => n.to_user === S.user && !n.read_at);
  $('#app').innerHTML = `
  <div class="hello"><h1>Hi ${esc(S.name)}, ready for today?</h1>
    <p class="muted">${fmtLong(D.t)} · Phase ${D.phase.n}: ${esc(D.phase.name)} · ${esc(FOCUS[D.prof.focus] || '')}</p></div>
  ${unread.length ? `<div class="card note-banner"><span>${icon('heart')}</span><div style="flex:1"><b class="w5">${esc(partner?.name || 'Your partner')}</b> sent you ${unread.length === 1 ? (unread[0].kind === 'cheer' ? 'a cheer' : unread[0].kind === 'share' ? 'an answer to look at' : 'a note') : unread.length + ' messages'}${unread[0].text ? `: “${esc(unread[0].text)}”` : '.'}</div><button class="btn sm ghost" data-go="together">Open</button></div>` : ''}
  <div class="grid g-3">
    <div class="card ink continue span-2">
      <div class="card-head"><span class="label">${next ? 'Continue' : 'Today'}</span><span class="pill">Step ${Math.min(doneN + 1, steps.length)} of ${steps.length}</span></div>
      ${next ? `<div class="row" style="align-items:flex-start;gap:14px">${kicon(next.block)}<div style="min-width:0"><h2 class="continue-title">${esc(next.title)}</h2><p class="muted" style="margin:6px 0 0">${esc(next.why)}</p></div></div>
        <div class="row wrap mt"><button class="btn on-ink" data-step="${next.key}">Start · about ${next.mins} min</button><button class="btn ghost-ink" data-go="today">See today's plan</button></div>
        ${steps.filter((x) => !x.done && x !== next).length ? `<div class="then"><span class="xs muted">Then</span>${steps.filter((x) => !x.done && x !== next).slice(0, 3).map((x) => `<span class="then-item">${kicon(x.block)}${esc(STEP_LABEL(x))}<span class="xs muted">${x.mins} min</span></span>`).join('')}</div>` : ''}`
      : `<h2 class="continue-title">Today is complete. Well done.</h2><p class="muted">Anything extra is a bonus. A full mock in Practice is a good stretch.</p><button class="btn on-ink mt" data-go="practice">Open Practice</button>`}
      <div class="cont-foot"><div class="bar"><i style="width:${Math.min(100, (D.todayMin / D.prof.daily) * 100)}%"></i><span class="mark" style="left:${(D.prof.minimum / D.prof.daily) * 100}%"></span></div>
      <div class="row between xs muted mt"><span>${Math.round(D.todayMin)} of ${D.prof.daily} min · ${D.prof.minimum} min keeps your streak</span><span>${D.streak}-day streak</span></div></div>
    </div>
    <div class="card today-mini">
      <div class="row" style="gap:14px">${ring(D.todayMin / D.prof.daily, 72, 7, `${Math.round(D.todayMin)}m`)}<div><b class="w5">Today's plan</b><div class="small muted">${doneN} of ${steps.length} steps · ${D.prof.daily} min target</div></div></div>
      <div class="mini-steps">${steps.map((x) => `<button class="mini-step ${x.done ? 'done' : ''} ${x === next ? 'next' : ''}" data-step="${x.key}">${x.done ? `<span class="kicon k-done">${icon('check')}</span>` : kicon(x.block)}<span>${esc(STEP_LABEL(x))}</span></button>`).join('')}</div>
    </div>
  </div>
  <div class="card">
    <div class="card-head"><span class="label">Your path · grammar course</span><span class="small ${C.behind ? 'down' : 'up'}">${C.behind ? `${C.behind} lesson${C.behind > 1 ? 's' : ''} behind plan` : C.ahead ? `${C.ahead} ahead of plan` : 'On plan'}</span></div>
    ${pathTrack(D)}
    <div class="row between wrap mt"><span class="small muted">${C.current ? `Up next: <b class="w5" style="color:var(--text)">${esc(C.current.title)}</b> · ${C.current.mins} min · plan by ${fmtDate(C.dueOf[C.current.id])}` : 'All lessons are Proficient. Keep reviews going.'}</span>
      <span class="row">${!C.diagnosed ? '<button class="btn sm" id="h-diag">Take the diagnostic first</button>' : C.current ? `<button class="btn sm" data-lesson="${C.current.id}">Open lesson</button>` : ''}<button class="btn sm ghost" data-go="learn">All lessons</button></span></div>
  </div>
  <div class="grid g-3">
    <div class="card span-2">
      <div class="card-head"><span class="label">Your skills · ${D.latest ? `${esc(D.latest.source)}, ${fmtDate(D.latest.date)}` : 'no test yet'}</span><span class="xs dim">score → target</span></div>
      ${skillTiles(D)}
      <p class="xs muted" style="margin:12px 0 0">${D.estimateOnly ? 'These are estimates. Take the EF SET and record it in Progress to see your real level.' : `These change only after a real test. Next checkpoint: ${D.nextCheck ? fmtDate(D.nextCheck.date) : 'none'}.`}</p>
    </div>
    ${partner ? `<div class="card partner-mini">
      <div class="card-head"><span class="label">Together</span><span class="xs dim">${partner.last === D.t ? 'active today' : partner.last ? 'last active ' + fmtDate(partner.last) : 'not started yet'}</span></div>
      <div class="row" style="gap:14px">${ring(partner.todayMin / Math.max(1, partner.daily), 56, 6, esc(partner.name[0]), 'ring-partner')}<div><b class="w5">${esc(partner.name)}</b><div class="small muted">${partner.streak}-day streak · ${Math.round(partner.todayMin)} of ${partner.daily} min</div></div></div>
      <div class="row mt wrap"><button class="btn sm" data-cheer="${partner.id}">${icon('heart')}Send a cheer</button><button class="btn sm ghost" data-go="together">See progress</button></div>
    </div>` : `<div class="card"><span class="label">Together</span><p class="small muted">Your study partner appears here once their account is ready.</p></div>`}
  </div>
  <div class="grid g-2">
    <div class="card">
      <div class="card-head"><span class="label">Consistency · last 12 weeks</span><span class="small muted">best streak ${D.best}</span></div>
      ${heatmap(D, 12)}
    </div>
    <div class="card">
      <div class="card-head"><span class="label">Mistakes to watch · 14 days</span>${D.patterns.length ? '<button class="btn sm ghost" data-go="review">Review</button>' : ''}</div>
      <div class="list">${D.patterns.slice(0, 3).map((c) => `<div class="li row between"><div><div>${esc(CATEGORIES[c.key]?.name || c.key)}</div>${c.examples[0] ? `<div class="xs"><span class="wrong">${esc(c.examples[0].wrong)}</span> → <span class="right">${esc(c.examples[0].correct)}</span></div>` : ''}</div>${CATEGORY_LESSON[c.key] ? `<button class="btn sm ghost" data-lesson="${CATEGORY_LESSON[c.key]}">Rule</button>` : ''}</div>`).join('') || '<p class="small muted" style="margin:0">No repeated mistakes yet. They appear here after AI feedback finds them.</p>'}</div>
    </div>
  </div>`;
  $$('[data-cheer]').forEach((b) => (b.onclick = () => sendCheer(b.dataset.cheer)));
  $('#h-diag') && ($('#h-diag').onclick = startDiagnostic);
}
// ================= TODAY =================
let TIMER = store.get('eh_timer');
function vToday(D) {
  const steps = planSteps(D);
  const nextKey = steps.find((s) => !s.done)?.key;
  $('#app').innerHTML = `
  ${pageHead(fmtLong(D.t), 'Today\'s plan')}
  <div class="grid g-3">
    <div class="span-2">
      <div class="card ink">
        <div class="row between"><span>${steps.filter((s) => s.done).length} of ${steps.length} steps done</span><span style="color:var(--sky)">${Math.round(D.todayMin)} / ${D.prof.daily} min</span></div>
        <div class="bar mt"><i style="width:${Math.min(100, (D.todayMin / D.prof.daily) * 100)}%"></i><span class="mark" style="left:${(D.prof.minimum / D.prof.daily) * 100}%"></span></div>
        <p class="xs muted" style="margin:10px 0 0">Work from top to bottom. Any time of day, any split. ${D.prof.minimum} minutes keeps your streak; ${D.prof.daily} minutes completes the day.</p>
      </div>
      <div class="card"><div class="list">
        ${steps.map((s, i) => `<div class="li step ${s.key === nextKey ? 'is-next' : ''}"><div class="row" style="align-items:flex-start">
          ${s.done ? `<span class="kicon k-done">${icon('check')}</span>` : kicon(s.block)}
          <div style="flex:1;min-width:0">
            <div class="row between wrap"><span class="step-title">${esc(s.title)}</span><span class="small ${s.done ? 'up' : 'muted'}">${s.block && BLOCK_INFO[s.block] && !['diagnostic', 'unit'].includes(s.key) && !s.key.startsWith('rev-') ? `${Math.round(D.actMin[s.block] || 0)} / ${s.mins} min` : `~${s.mins} min`}</span></div>
            <div class="xs muted">${esc(s.why)}</div>
            <div class="row wrap mt"><button class="btn sm ${s.key === nextKey ? '' : 'ghost'}" data-step="${s.key}">${s.done ? 'Do more' : 'Start'}</button>${s.key === 'speak' || s.key === 'write' ? `<button class="btn sm ghost" data-go="practice" data-sub="${s.key === 'speak' ? 'speaking' : 'writing'}">Choose another task</button>` : ''}${s.key === 'listen' ? '' : ''}</div>
          </div></div></div>`).join('')}
      </div></div>
    </div>
    <div>
      <div class="card" id="timer-card"></div>
      <div class="card">
        <div class="card-head"><span class="label">Listening sources</span></div>
        <div class="list">${LISTENING_SOURCES.map((s) => `<div class="li"><a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)} ↗</a></div>`).join('')}</div>
      </div>
      <div class="card">
        <div class="card-head"><span class="label">Log time manually</span></div>
        <label>Activity</label><select id="m-act">${Object.keys(BLOCK_INFO).map((k) => `<option value="${k}">${esc(BLOCK_INFO[k].label)}</option>`).join('')}<option value="other">Other English practice</option></select>
        <label>Minutes</label><input id="m-min" type="number" min="1" max="180" inputmode="numeric" placeholder="20" />
        <button class="btn full mt" id="m-log">Log time</button>
      </div>
    </div>
  </div>`;
  $('#m-log').onclick = async () => { const m = Number($('#m-min').value); if (!(m > 0)) return toast('Enter the minutes first.', 'err'); await logTime($('#m-act').value, m); };
  drawTimer();
}
let timerTick = null;
function startTimer(activity) {
  if (TIMER) return toast('A timer is already running. Stop it first.', 'err');
  TIMER = { activity, start: Date.now() }; store.set('eh_timer', TIMER); drawTimer();
  $('#timer-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function drawTimer() {
  const el = $('#timer-card'); if (!el) return;
  clearInterval(timerTick);
  if (!TIMER) { el.innerHTML = `<div class="card-head"><span class="label">Timer</span></div><p class="xs muted" style="margin:0 0 10px">For listening, partner platforms or reading outside the app.</p><button class="btn ghost full" id="t-start">Start listening timer</button>`; $('#t-start').onclick = () => startTimer('listening'); return; }
  const label = BLOCK_INFO[TIMER.activity]?.label || 'Practice';
  el.innerHTML = `<div class="card-head"><span class="label"><span class="recording-dot"></span>${esc(label)}</span></div>
    <div class="timer" id="t-val">0:00</div>
    <div class="row mt" style="justify-content:center"><button class="btn" id="t-stop">Stop and log</button><button class="btn ghost" id="t-cancel">Discard</button></div>`;
  const upd = () => { const v = $('#t-val'); if (v) v.textContent = mmss((Date.now() - TIMER.start) / 1000); };
  upd(); timerTick = setInterval(upd, 1000);
  $('#t-stop').onclick = async () => {
    const mins = Math.min(180, (Date.now() - TIMER.start) / 60000);
    const act = TIMER.activity; TIMER = null; store.del('eh_timer'); clearInterval(timerTick);
    if (mins < 1) { toast('Under a minute — not logged.'); return render(); }
    await logTime(act, Math.round(mins * 10) / 10);
  };
  $('#t-cancel').onclick = () => { if (!confirm('Discard this timer?')) return; TIMER = null; store.del('eh_timer'); drawTimer(); };
}
async function logTime(activity, minutes, type = 'study') {
  try {
    const r = await send('/api/event', { date: today(), type, activity, minutes });
    if (r) toast(`Logged ${minutes} min · ${esc(BLOCK_INFO[activity]?.label || 'Practice')}`);
  } catch (e) { return toast(esc(e.message), 'err'); }
  try { await refresh(); } catch { /* keep view */ }
  render();
}

// ================= LEARN (course path + grammar reference) =================
function vLearn(D) {
  const C = D.course; const tab = SUB.learn || 'course';
  let body = '';
  if (tab === 'course') {
    body = `
    <div class="grid g-3 top">
      <div class="card ink span-2">
        <div class="card-head"><span class="label">Your grammar course</span><span class="pill">${C.masteryPct}% mastery</span></div>
        <div class="stats"><div><div class="v">${C.learned}</div><div class="l">Learned (Familiar+)</div></div><div><div class="v">${C.proficient}</div><div class="l">Proficient</div></div><div><div class="v">${C.mastered}</div><div class="l">Mastered</div></div></div>
        <div class="mastery-strip mt">${LESSONS.map((l) => `<i class="lv${C.level(l.id)}" title="${esc(l.title)}"></i>`).join('')}</div>
        <p class="xs muted" style="margin:12px 0 0">Each lesson: pre-check → rules → quick check → use it in a speaking or writing task. Reviews come back automatically after 2, 5 and 21 days.</p>
        ${C.current ? `<div class="row between wrap mt" style="padding-top:14px;border-top:0.5px solid var(--ink-line)"><div><span class="xs muted">Up next</span><div class="next-title">${esc(C.current.title)}</div><div class="xs muted">${C.current.mins} min · plan: by ${fmtDate(C.dueOf[C.current.id])}</div></div><button class="btn on-ink" data-lesson="${C.current.id}">Open lesson</button></div>` : ''}
      </div>
      <div class="card">
        <span class="label">How mastery works</span>
        <div class="list mt">${MASTERY.map((m, i) => `<div class="li row" style="align-items:flex-start"><i class="lvdot lv${i}"></i><div><div class="small">${m}</div><div class="xs muted">${LEVEL_HINT[i]}</div></div></div>`).join('')}</div>
      </div>
    </div>
    ${!C.diagnosed ? `<div class="card wash"><div class="row between wrap"><div><h3>Start with the diagnostic</h3><p class="small muted" style="margin:4px 0 0">38 questions, about 12 minutes. Lessons you already know are marked Familiar, so you can skip their reading.</p></div><button class="btn" id="go-diag">Take the diagnostic</button></div></div>` : ''}
    ${C.unitTest ? `<div class="card"><div class="row between wrap"><div><span class="label">Unit test ready</span><h3 style="margin-top:4px">${esc(C.unitTest.name)}</h3></div><button class="btn" data-step="unit">Take unit test</button></div></div>` : ''}
    <div class="grid g-2">${C.units.map((u, ui) => `<div class="card">
      <div class="card-head"><span class="label">${esc(u.name)}</span><span class="xs dim">${u.passed ? 'Unit passed' : `${u.done} / ${u.lessons.length} proficient`}</span></div>
      <div class="list">${u.lessons.map((l) => { const lv = C.level(l.id); return `<div class="li click row" data-lesson="${l.id}"><i class="lvdot lv${lv}"></i><div style="flex:1;min-width:0"><div>${esc(l.title)}</div><div class="xs muted">${MASTERY[lv]} · ${l.mins} min · plan: by ${fmtDate(C.dueOf[l.id])}${C.M[l.id]?.next_review && lv >= 2 ? ` · review ${fmtDate(C.M[l.id].next_review)}` : ''}</div></div>${C.current?.id === l.id ? '<span class="pill">Up next</span>' : '<span class="dim">›</span>'}</div>`; }).join('')}</div>
      ${u.ready && !u.passed ? `<button class="btn sm mt" data-unit="${u.id}">Take unit test</button>` : ''}
    </div>`).join('')}</div>`;
  } else {
    const q = (SUB.refq || '').toLowerCase();
    const hits = LESSONS.flatMap((l) => l.rules.map((r) => ({ l, r }))).filter(({ l, r }) => !q || (l.title + r.h + r.body + r.good.join(' ') + r.bad.join(' ')).toLowerCase().includes(q));
    body = `<div class="card"><input id="ref-q" placeholder="Search rules: in on at, a an, since, responsible for…" value="${esc(SUB.refq || '')}" /></div>
    <div class="grid g-2">${hits.slice(0, 60).map(({ l, r }) => `<div class="card ref-card"><span class="label">${esc(l.title)}</span><h3 style="margin:6px 0">${esc(r.h)}</h3><p class="small" style="margin:0 0 8px">${esc(r.body)}</p>
      ${r.good.slice(0, 3).map((g) => `<div class="small"><span class="right">✓</span> ${esc(g)}</div>`).join('')}${r.bad.slice(0, 2).map((b) => `<div class="small"><span class="down">✗</span> <span class="wrong">${esc(b)}</span></div>`).join('')}
      <a href="#" class="xs" data-lesson="${l.id}">Open lesson</a></div>`).join('') || '<p class="muted">No rule matches that search.</p>'}</div>`;
  }
  $('#app').innerHTML = `${pageHead(`${LESSONS.length} lessons in ${UNITS.length} units`, 'Learn the rules')}
    <div class="seg narrow-seg">${[['course', 'Course'], ['reference', 'Grammar reference']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
  $$('[data-t]').forEach((b) => (b.onclick = () => { SUB.learn = b.dataset.t; render(); }));
  $('#go-diag') && ($('#go-diag').onclick = startDiagnostic);
  $$('[data-unit]').forEach((b) => (b.onclick = () => { const u = UNITS.find((x) => x.id === b.dataset.unit); startQuiz({ kind: 'unit', title: `Unit test · ${u.name}`, questions: unitQuestions(u.id) }); }));
  const rq = $('#ref-q'); if (rq) { rq.oninput = () => { SUB.refq = rq.value; const pos = rq.selectionStart; render(); const n = $('#ref-q'); n.focus(); n.setSelectionRange(pos, pos); }; }
}

const doneHero = (title, sub, good = true) => `<div class="done-hero ${good ? 'good' : 'retry'}"><span class="done-icon">${icon(good ? 'check' : 'grammar')}</span><div><h2>${title}</h2>${sub ? `<p class="muted" style="margin:4px 0 0">${sub}</p>` : ''}</div></div>`;

// Generic multiple-choice quiz (diagnostic / pre-check / check / review / unit) → mastery
function startQuiz({ kind, title, questions, intro, onDone, record = true, lessonId = null }) {
  const qs = questions.map((q) => { const order = shuffle(q.o.map((t, k) => ({ t, k }))); return { ...q, opts: order, ans: order.findIndex((x) => x.k === q.a) }; });
  const answers = []; let i = 0, answered = false; const t0 = Date.now();
  RUN = {
    view: 'learn', done: false,
    render() {
      if (i >= qs.length) return finish();
      const q = qs[i];
      $('#app').innerHTML = `<div class="runner-narrow"><div class="card"><div class="card-head"><span class="label"><span class="dot"></span>${esc(title)}</span><span class="xs dim">${i + 1} of ${qs.length}</span></div>
        ${intro && i === 0 ? `<p class="small muted">${esc(intro)}</p>` : ''}
        <div class="steps">${qs.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        ${kind === 'diagnostic' || kind === 'unit' ? `<div class="xs dim mb">${esc(LESSON[q.lesson]?.title || '')}</div>` : ''}
        <div class="question">${esc(q.q)}</div>
        <div class="opts">${q.opts.map((o, k) => `<button class="opt" data-o="${k}"><span class="opt-key">${'ABCD'[k]}</span>${esc(o.t)}</button>`).join('')}</div>
        <div id="qz-why" class="mt"></div>
        <div class="row mt"><button class="btn" id="qz-next" disabled>${i < qs.length - 1 ? 'Next' : 'See result'}</button><span class="xs dim">Keys: A–D, Enter</span></div></div></div>`;
      answered = false;
      const choose = (k) => {
        if (answered) return; answered = true;
        const ok = k === q.ans; answers.push({ lesson: q.lesson, ok });
        $$('[data-o]')[k].classList.add(ok ? 'correct' : 'incorrect'); $$('[data-o]')[q.ans].classList.add('correct');
        $('#qz-why').innerHTML = `<div class="small ${ok ? 'up' : 'down'}">${ok ? 'Correct.' : 'Not quite.'}</div><div class="small muted">${esc(q.why)}</div>`;
        $('#qz-next').disabled = false; $('#qz-next').focus();
      };
      $$('[data-o]').forEach((b) => (b.onclick = () => choose(+b.dataset.o)));
      $('#qz-next').onclick = () => { if (!answered) return; answered = false; i++; RUN.render(); };
      keyHandler = (e) => { const k = 'abcd'.indexOf(e.key.toLowerCase()); if (k >= 0 && k < q.opts.length) choose(k); else if (e.key === 'Enter' && answered) { e.preventDefault(); i++; RUN.render(); } };
    },
  };
  let finished = false;
  async function finish() {
    if (finished) return; finished = true;
    keyHandler = null;
    const per = scoreByLesson(answers);
    const right = answers.filter((a) => a.ok).length;
    const score = Math.round((right / answers.length) * 100);
    const mins = Math.max(1, Math.min(60, Math.round(((Date.now() - t0) / 60000) * 10) / 10));
    let res = null;
    if (record) {
      try { res = await send('/api/mastery', { date: today(), kind, results: per, minutes: mins }); } catch (e) { toast(esc(e.message), 'err'); }
      try { await refresh(); } catch { /* keep */ }
    }
    if (onDone) return onDone({ score, per, res });
    const changes = (res?.results || []).filter((r) => r.level !== r.from);
    RUN = {
      view: 'learn', done: true,
      render() {
        const up = changes.filter((c) => c.level > c.from);
        $('#app').innerHTML = `<div class="runner-narrow"><div class="card">
          ${doneHero(kind === 'diagnostic' ? 'Diagnostic complete' : score >= 80 ? 'Nicely done' : 'Finished', kind === 'diagnostic' ? `${up.filter((c) => c.level >= 2).length} lessons are already Familiar. Your course now skips their reading.` : `${right} of ${answers.length} correct${up.length ? ` · ${up.length} lesson${up.length > 1 ? 's' : ''} moved up` : ''}`, score >= 50 || kind === 'diagnostic')}
          <div class="row between mt" style="align-items:flex-end"><div><span class="xs muted">${esc(title)}</span><div class="band">${score}%</div></div><span class="pill">${right} of ${answers.length} correct</span></div>
          ${changes.length ? `<div class="fb-section"><h3>Mastery changes</h3><div class="list">${changes.map((c) => `<div class="li row between"><span>${esc(LESSON[c.lesson]?.title || c.lesson)}</span><span class="small">${MASTERY[c.from]} → <b style="font-weight:500">${MASTERY[c.level]}</b></span></div>`).join('')}</div></div>` : ''}
          ${kind === 'diagnostic' ? '<p class="small">Lessons you answered fully are now Familiar — open them only for a quick check. Your Next step starts with the first lesson you still need.</p>' : ''}
          <div class="row wrap mt"><button class="btn" id="qz-done">${kind === 'diagnostic' ? 'See my course' : 'Back to today'}</button></div></div></div>`;
        $('#qz-done').onclick = () => { RUN = null; go(kind === 'diagnostic' ? 'learn' : 'today'); };
      },
    };
    render();
  }
  render();
}
let keyHandler = null;
document.addEventListener('keydown', (e) => { if (keyHandler && !/input|textarea|select/i.test(e.target.tagName)) keyHandler(e); });

function startDiagnostic() {
  startQuiz({ kind: 'diagnostic', title: 'Grammar diagnostic', questions: diagnosticQuestions(), intro: 'Answer without notes. If you don\'t know, choose your best guess — it is only used to plan your course.' });
}

function openLesson(id) {
  const l = LESSON[id]; if (!l) return;
  if (RUN && !RUN.done && !confirm('Leave this task? Your answer here won\'t be saved.')) return;
  const D = derive(); const lv = D.course.level(id);
  const unitName = UNITS.find((u) => u.id === l.unit)?.name || '';
  const idx = LESSONS.indexOf(l);
  const t0 = Date.now();
  const stage = lv === 0 && !store.get('ec_pre_' + id) ? 'pre' : 'read';
  let preScore = null;
  const screens = [{ kind: 'why', h: 'Why it matters' }, ...l.rules.map((r) => ({ kind: 'rule', h: r.h, r })), { kind: 'trap', h: 'Watch out' }];
  let k = 0;
  const check = () => startQuiz({ kind: 'check', title: `Quick check · ${l.title}`, questions: fullCheck(l), onDone: ({ score, res }) => lessonResult(l, score, res, t0) });
  const showLesson = () => {
    RUN = {
      view: 'learn', done: true,
      render() {
        const sc = screens[k]; const last = k === screens.length - 1;
        let body = '';
        if (sc.kind === 'why') body = `${preScore !== null ? `<div class="pre-note">Pre-check: ${preScore}%. Read the ${l.rules.length} rules, then see how much you improve.</div>` : ''}<p class="lesson-lead">${esc(l.why)}</p>
          <div class="lesson-plan">${l.rules.map((r, i) => `<div><span class="pn">${i + 1}</span>${esc(r.h)}</div>`).join('')}</div>`;
        else if (sc.kind === 'rule') body = `<p class="lesson-lead">${esc(sc.r.body)}</p>
          <div class="examples">
            ${sc.r.good.length ? `<div><div class="ex-head up">${icon('check')}Say this</div><div class="list">${sc.r.good.map((g) => `<div class="li row between"><span>${esc(g)}</span><button class="icon-btn sm" data-say="${esc(g.replace(/\s*\(.*\)$/, ''))}" aria-label="Listen">${icon('play')}</button></div>`).join('')}</div></div>` : ''}
            ${sc.r.bad.length ? `<div><div class="ex-head down">Not this</div><div class="list">${sc.r.bad.map((b) => `<div class="li"><span class="wrong">${esc(b)}</span></div>`).join('')}</div></div>` : ''}
          </div>`;
        else body = `<div class="trap">${esc(l.trap)}</div><p class="small muted" style="margin-top:14px">That's the whole lesson. The quick check has ${l.check.length} questions; 80% moves you on.</p>`;
        $('#app').innerHTML = `
        ${pageHead(`Lesson ${idx + 1} of ${LESSONS.length} · ${esc(unitName)} · ${l.mins} min`, esc(l.title))}
        <div class="lesson-grid">
          <div class="card lesson-card">
            <div class="steps">${screens.map((_, i) => `<i class="${i <= k ? 'on' : ''}"></i>`).join('')}</div>
            <div class="lesson-kicker">${sc.kind === 'rule' ? `Rule ${k} of ${l.rules.length}` : sc.kind === 'why' ? 'Start here' : 'Last tip'}</div>
            <h2 class="lesson-h">${esc(sc.h)}</h2>
            ${body}
            <div class="lesson-nav">
              <button class="btn ghost" id="ls-prev" ${k === 0 ? 'disabled' : ''}>Back</button>
              ${last ? '<button class="btn" id="ls-check">Take the quick check</button>' : '<button class="btn" id="ls-next">Next</button>'}
            </div>
            <div class="xs dim center mt">Use ← and → to move between screens.</div>
          </div>
          <aside class="lesson-side">
            <div class="card">
              <span class="label">In this lesson</span>
              <div class="lesson-toc">${screens.map((x, i) => `<button class="${i === k ? 'on' : ''} ${i < k ? 'seen' : ''}" data-k="${i}"><span class="pn">${i < k ? icon('check') : i + 1}</span>${esc(x.h)}</button>`).join('')}
                <button data-k="check"><span class="pn">${icon('flag')}</span>Quick check · ${l.check.length} questions</button></div>
              <div class="xs muted mt">Your level: <b class="w5">${MASTERY[lv]}</b>. ${LEVEL_HINT[lv]}</div>
            </div>
            <details class="card"><summary class="label" style="cursor:pointer">Ringkasan dalam bahasa Indonesia</summary><p class="small" style="margin:10px 0 0">${esc(l.id_sum)}</p></details>
            <button class="btn ghost full" id="ls-back">Back to course</button>
          </aside>
        </div>`;
        $$('[data-say]').forEach((b) => (b.onclick = () => speak(b.dataset.say)));
        const move = (n) => { k = Math.max(0, Math.min(screens.length - 1, n)); RUN.render(); window.scrollTo(0, 0); };
        $('#ls-prev').onclick = () => move(k - 1);
        $('#ls-next') && ($('#ls-next').onclick = () => move(k + 1));
        $('#ls-check') && ($('#ls-check').onclick = () => { keyHandler = null; check(); });
        $$('[data-k]').forEach((b) => (b.onclick = () => { if (b.dataset.k === 'check') { keyHandler = null; return check(); } move(+b.dataset.k); }));
        $('#ls-back').onclick = () => { keyHandler = null; RUN = null; go('learn'); };
        keyHandler = (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); if (k < screens.length - 1) move(k + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); move(k - 1); } };
      },
    };
    render(); window.scrollTo(0, 0);
  };
  if (stage === 'pre') {
    startQuiz({
      kind: 'check', title: `Pre-check · ${l.title}`, questions: preCheck(l), record: false,
      intro: 'Two questions before you read. Mistakes are fine. This shows what the lesson will fix.',
      onDone: ({ score }) => { store.set('ec_pre_' + id, 1); preScore = score; showLesson(); },
    });
  } else showLesson();
}
function lessonResult(l, score, res, t0) {
  const r = res?.results?.[0];
  const D = derive(); const tasks = planTasks(D);
  const passed = score >= 80;
  RUN = {
    view: 'learn', done: true,
    render() {
      $('#app').innerHTML = `<div class="runner-narrow"><div class="card">
        ${doneHero(passed ? (r && r.level > r.from ? `${esc(l.title)}: now ${MASTERY[r.level]}` : 'Lesson passed') : 'Almost there', passed ? 'Next, use the rule in a real task. That is where it becomes a habit.' : 'You need 80% to move on. One more read usually does it.', passed)}
        <div class="row between mt" style="align-items:flex-end"><div><span class="xs muted">Quick check</span><div class="band">${score}%</div></div>${r ? `<span class="pill">${MASTERY[r.from]} → ${MASTERY[r.level]}</span>` : ''}</div>
        <p class="small muted">${passed ? 'The AI feedback will check this grammar point in your next answer.' : 'Read the rules again, then take the quick check.'}</p>
        ${r?.next_review ? `<p class="xs muted">Next review: ${fmtDate(r.next_review)}. It will appear in your plan automatically.</p>` : ''}
        <div class="row wrap mt">
          ${passed ? `<button class="btn" data-start="${tasks.speaking.id}" data-focus="${esc(l.title)}">Apply · ${esc(tasks.speaking.title)}</button><button class="btn ghost" data-start="${tasks.writing.id}" data-focus="${esc(l.title)}">Apply · ${esc(tasks.writing.title)}</button>` : `<button class="btn" data-lesson="${l.id}">Read again</button>`}
          ${l.tags.find((t) => DRILLS[t]) ? '<button class="btn ghost" id="lr-drill">Extra drill</button>' : ''}
          <button class="btn ghost" id="lr-back">Course</button>
        </div></div></div>`;
      bindCommon();
      $('#lr-back').onclick = () => { RUN = null; go('learn'); };
      if ($('#lr-drill')) $('#lr-drill').onclick = () => startDrill([l.tags.find((t) => DRILLS[t])]);
    },
  };
  render();
}

// ================= PRACTICE =================
function vPractice(D) {
  const stats = Object.fromEntries(S.gateStats.map((g) => [g.gate_id, g]));
  const filt = SUB.practice || 'all';
  const exam = SUB.exam || 'all';
  const exams = ['all', ...new Set(GATES.map((g) => g.exam))];
  const list = GATES.filter((g) => (filt === 'all' || g.skill === filt) && (exam === 'all' || g.exam === exam));
  const plan = planTasks(D);
  const focus = D.course.current?.title || null;
  let n = 0;
  $('#app').innerHTML = `
  ${pageHead(`${GATES.length} task types · IELTS, TOEFL, interviews and teaching`, 'Practise and get feedback')}
  <div class="row wrap mb"><div class="seg" style="margin:0;flex:0 0 auto">${['all', 'speaking', 'writing'].map((k) => `<button data-f="${k}" class="${filt === k ? 'on' : ''}">${cap(k)}</button>`).join('')}</div>
  <div class="pills">${exams.map((e) => `<button class="pill ${exam === e ? 'on' : ''}" data-e="${esc(e)}">${e === 'all' ? 'All exams' : esc(e)}</button>`).join('')}</div></div>
  ${focus ? `<p class="small muted">Today's grammar focus: <b style="font-weight:500">${esc(focus)}</b>. AI feedback will check it.</p>` : ''}
  ${'EDCBAS'.split('').map((r) => {
    const gs = list.filter((g) => g.rank === r); if (!gs.length) return '';
    return `<div class="label" style="margin:18px 2px 10px">${TASK_LEVELS[r]}</div>
    <div class="grid g-3">${gs.map((g) => {
      const st = stats[g.id]; const suggested = g.id === plan.speaking.id || g.id === plan.writing.id;
      return `<div class="card task-card ${suggested ? 'suggested' : ''}" data-start="${g.id}" ${focus ? `data-focus="${esc(focus)}"` : ''}>
        <div class="row between">${kicon(g.skill)}<span class="pills" style="gap:5px"><span class="pill">${esc(g.exam)}</span>${suggested ? '<span class="pill on-pill">Suggested today</span>' : ''}</span></div>
        <h3>${esc(g.title)}</h3><div class="small muted">${esc(g.desc)}</div>
        <div class="xs dim mt">~${g.mins} min · ${g.mode === 'ai' ? 'AI feedback' : 'scored on device'}${st ? ` · done ${st.clears}×${st.best_band ? ` · best ${st.best_band}` : ''}${st.best_score != null ? ` · best ${Math.round(st.best_score)}%` : ''}` : ''}</div>
      </div>`;
    }).join('')}</div>`;
  }).join('')}`;
  $$('[data-f]').forEach((b) => (b.onclick = () => { SUB.practice = b.dataset.f; render(); }));
  $$('[data-e]').forEach((b) => (b.onclick = () => { SUB.exam = b.dataset.e; render(); }));
}

function startTask(gate, focus = null) {
  if (!gate) return;
  if (gate.mode === 'ai' && S.ai.left <= 0) return toast('No AI feedback left today. It resets at 07:00 WIB. Device-scored tasks, lessons and drills still work.', 'err');
  const task = makeTask(gate);
  if (gate.mode === 'repeat') RUN = repeatRunner(gate, task);
  else if (gate.mode === 'build') RUN = buildRunner(gate, task);
  else if (gate.skill === 'speaking') RUN = speakingRunner(gate, task, focus);
  else RUN = writingRunner(gate, task, focus);
  RUN.view = 'practice';
  render(); window.scrollTo(0, 0);
}
function exitRun() { RUN = null; render(); }
const taskHead = (gate, extra = '', focus = null) => `<div class="card-head"><span class="label"><span class="dot"></span>${esc(gate.exam)} · ${TASK_LEVELS[gate.rank]}${extra}</span>${focus ? `<span class="pill">Focus: ${esc(focus)}</span>` : ''}</div><h2 style="margin-bottom:12px">${esc(gate.title)}</h2>`;
const gatePayload = (g) => ({ id: g.id, rank: g.rank, skill: g.skill, exam: g.exam, title: g.title });

// ---- Speaking (AI) — question on the left, recorder on the right ----
function speakingRunner(gate, task, focus) {
  const qs = task.questions;
  const limits = task.limits || qs.map(() => gate.perQ || 60);
  const answers = qs.map(() => ''); const secs = qs.map(() => 0);
  const needsPrep = (k) => (gate.prep && k === 0) || task.prepAt === k;
  let i = 0, phase = needsPrep(0) ? 'prep' : 'ready', rec = null, tick = null, t0 = 0;
  const self = {
    render() {
      clearInterval(tick);
      const q = qs[i];
      $('#app').innerHTML = `<div class="card">${taskHead(gate, ` · ${i + 1} of ${qs.length}`, focus)}
        <div class="steps">${qs.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="split">
          <div>
            ${task.header ? `<div class="small muted mb">${esc(task.header)}</div>` : ''}
            <div class="question">${esc(q)}</div>
            <div class="row between"><button class="btn sm ghost" id="s-hear">Hear the question</button><span class="xs muted">Limit ${mmss(limits[i])}</span></div>
            ${focus ? `<p class="xs muted mt">Try to use: <b style="font-weight:500">${esc(focus)}</b>.</p>` : ''}
          </div>
          <div>
            ${phase === 'prep' ? `<p class="small muted" style="margin-top:0">Preparation: keywords only. Speaking starts when the timer ends.</p><div class="timer" id="s-timer">${mmss(60)}</div><textarea id="s-notes" placeholder="Notes (not submitted)" style="min-height:120px"></textarea><button class="btn full mt" id="s-skip">I'm ready</button>`
            : `<div class="timer" id="s-timer">${mmss(limits[i])}</div>
            <button class="btn full mt ${phase === 'rec' ? 'rec' : ''}" id="s-rec">${phase === 'rec' ? 'Stop recording' : answers[i] ? 'Record more' : 'Start speaking'}</button>
            <label>Transcript — fix recognition mistakes only, not your grammar</label>
            <textarea id="s-text" placeholder="${Recorder.supported() ? 'Your words appear here as you speak…' : 'Voice input unavailable: tap here and use your keyboard microphone.'}">${esc(answers[i])}</textarea>
            <div class="row between mt"><span class="xs muted" id="s-wc">${words(answers[i])} words</span>
            <button class="btn" id="s-next" ${phase === 'rec' ? 'disabled' : ''}>${i < qs.length - 1 ? 'Next question' : 'Get feedback'}</button></div>`}
          </div>
        </div>
        <button class="btn ghost mt" id="s-quit">Leave task</button></div>`;
      $('#s-hear').onclick = () => { if (phase !== 'rec') speak(q.replace(/^\[.*?\]\s*/, '').replace(/You should say:[\s\S]*/, '')); };
      $('#s-quit').onclick = () => { if (!confirm('Leave this task?')) return; rec?.stop(); exitRun(); };
      if (phase === 'prep') {
        let left = 60; const el = $('#s-timer');
        tick = setInterval(() => { left--; el.textContent = mmss(left); if (left <= 0) { phase = 'ready'; self.render(); } }, 1000);
        $('#s-skip').onclick = () => { phase = 'ready'; self.render(); };
        return;
      }
      const ta = $('#s-text');
      ta.oninput = () => { answers[i] = ta.value; $('#s-wc').textContent = words(ta.value) + ' words'; };
      $('#s-rec').onclick = () => {
        if (phase === 'rec') { secs[i] += rec.stop(); phase = 'ready'; clearInterval(tick); setTimeout(() => self.render(), 350); return; }
        rec = new Recorder((txt) => { answers[i] = txt; const t = $('#s-text'); if (t) { t.value = txt; $('#s-wc').textContent = words(txt) + ' words'; } });
        if (!rec.start(answers[i])) return;
        phase = 'rec'; t0 = Date.now(); self.render();
        const el = $('#s-timer'); const limit = limits[i];
        tick = setInterval(() => {
          const left = limit - (Date.now() - t0) / 1000;
          el.textContent = mmss(left); el.className = 'timer' + (left <= 10 ? ' warn' : '') + (left <= 0 ? ' over' : '');
          if (left <= 0) { secs[i] += rec.stop(); phase = 'ready'; clearInterval(tick); toast('Time\'s up for this question.'); setTimeout(() => self.render(), 400); }
        }, 250);
      };
      $('#s-next').onclick = async () => {
        answers[i] = $('#s-text').value;
        if (words(answers[i]) < 3 && !confirm('This answer is almost empty. Continue anyway?')) return;
        if (!secs[i]) secs[i] = Math.min(limits[i], words(answers[i]) / 2);
        if (i < qs.length - 1) { i++; phase = needsPrep(i) ? 'prep' : 'ready'; self.render(); window.scrollTo(0, 0); return; }
        const response = qs.map((qq, k) => `Q${k + 1}: ${qq.split('\n')[0]}\nA${k + 1}: ${answers[k] || '(no answer)'}`).join('\n\n');
        const prompt = (task.header ? task.header + '\n' : '') + qs.map((qq, k) => `Q${k + 1}: ${qq}`).join('\n');
        await submitAI(gate, prompt, response, Math.round(secs.reduce((a, b) => a + b, 0)), 'Each answer was spoken; time limits per question: ' + limits.map(mmss).join(', '), focus, self);
      };
    },
  };
  return self;
}

// ---- Writing (AI) — prompt on the left, editor on the right ----
const WRITING_TIPS = {
  'toefl-email': ['Greeting that fits the reader', 'One short paragraph per bullet point', 'Polite request or next step', 'Closing line and name'],
  'ielts-gt1': ['Opening that fits the tone (Dear Mr…/Hi…)', 'State the purpose in the first sentence', 'Cover all three bullet points', 'Matching closing (Yours sincerely / faithfully / Best wishes)'],
  'toefl-discussion': ['State your opinion in the first sentence', 'Add one reason with an example', 'Refer to a classmate\'s idea', 'Finish with a short conclusion'],
  'ielts-task2': ['Introduction: paraphrase + your position', 'Two body paragraphs, one main idea each', 'Examples and explanations', 'Conclusion that restates your view'],
  'mock-writing': ['Plan for 5 minutes first', 'Introduction · two body paragraphs · conclusion', 'Leave 3 minutes to check articles and verb forms'],
  'ielts-ac1': ['Overview sentence: the main trends', 'Compare the biggest and smallest values', 'Use accurate numbers', 'No personal opinion'],
  'teach-email': ['Clear subject and greeting', 'Purpose in the first sentence', 'One paragraph per point', 'Friendly, professional closing'],
};
function writingRunner(gate, task, focus) {
  const key = `eh_draft_${S.user}_${gate.id}`;
  const saved = store.get(key);
  const prompt = saved?.prompt || task.prompt;
  let text = saved?.text || '';
  const t0 = saved?.t0 || Date.now();
  store.set(key, { prompt, text, t0 });
  let tick = null;
  const limit = gate.mins * 60;
  const tips = WRITING_TIPS[gate.id] || [];
  const self = {
    render() {
      clearInterval(tick);
      $('#app').innerHTML = `<div class="card">${taskHead(gate, '', focus)}
        <div class="split wide-right">
          <div class="sticky-col">
            <div class="question">${esc(prompt)}</div>
            ${tips.length ? `<span class="label">Checklist</span><ul class="tips">${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
            ${focus ? `<p class="xs muted">Try to use: <b style="font-weight:500">${esc(focus)}</b>.</p>` : ''}
            <div class="row mt"><button class="btn ghost sm" id="w-new">New prompt</button><button class="btn ghost sm" id="w-quit">Save draft and leave</button></div>
          </div>
          <div>
            <div class="row between"><span class="xs muted">${gate.mins} min · ${gate.minWords}+ words${gate.strict ? ' · locks at 0:00' : ''}</span><span class="timer" id="w-timer" style="font-size:1.5rem">${mmss(limit)}</span></div>
            <textarea id="w-text" class="editor" spellcheck="false" autocorrect="off" autocapitalize="sentences" placeholder="Write here. Spellcheck is off, as in the real exam.">${esc(text)}</textarea>
            <div class="row between mt"><span class="small" id="w-wc"></span><button class="btn" id="w-submit">Get feedback</button></div>
          </div>
        </div></div>`;
      const ta = $('#w-text'); const wc = $('#w-wc');
      const upd = () => { const n = words(ta.value); wc.innerHTML = `<span class="${n >= gate.minWords ? 'up' : 'muted'}">${n}</span> <span class="dim">/ ${gate.minWords} words</span>`; };
      upd();
      ta.oninput = () => { text = ta.value; store.set(key, { prompt, text, t0 }); upd(); };
      const el = $('#w-timer');
      const tickFn = () => {
        const left = limit - (Date.now() - t0) / 1000;
        el.textContent = (left < 0 ? '+' : '') + mmss(Math.abs(left));
        el.className = 'timer' + (left <= 120 ? ' warn' : '') + (left <= 0 ? ' over' : '');
        if (gate.strict && left <= 0 && !ta.readOnly) { ta.readOnly = true; toast('Time\'s up. Submit your essay.', 'err'); }
      };
      tickFn(); tick = setInterval(tickFn, 1000);
      $('#w-new').onclick = () => { if (ta.value.trim() && !confirm('Discard this draft and get a new prompt?')) return; store.del(key); RUN = writingRunner(gate, makeTask(gate), focus); RUN.view = 'practice'; render(); };
      $('#w-quit').onclick = () => { clearInterval(tick); toast('Draft saved on this device.'); exitRun(); };
      $('#w-submit').onclick = async () => {
        if (words(ta.value) < gate.minWords * 0.5 && !confirm('This is much shorter than required, which lowers the band. Submit anyway?')) return;
        clearInterval(tick);
        const ok = await submitAI(gate, prompt, ta.value, Math.round(Math.min(7200, (Date.now() - t0) / 1000)), `Minimum length ${gate.minWords} words; time limit ${gate.mins} minutes.`, focus, self);
        if (ok) store.del(key);
      };
    },
  };
  return self;
}

async function submitAI(gate, prompt, response, seconds, note, focus, runner) {
  $('#app').innerHTML = `<div class="runner-narrow"><div class="card center" style="padding:40px 18px"><span class="label"><span class="dot" style="animation:pulse 1.2s infinite"></span>Reviewing your answer</span><p class="muted small">Task, coherence, vocabulary and grammar. About 15 seconds.</p></div></div>`;
  try {
    const r = await api('/api/gate/ai', { body: { date: today(), gate: gatePayload(gate), prompt, response, seconds, note, focus } });
    await refresh();
    RUN = { view: 'practice', done: true, render: () => feedbackView(gate, r, response, focus) };
    render(); window.scrollTo(0, 0);
    return true;
  } catch (e) {
    toast(esc(e.message), 'err');
    RUN = runner; RUN.render();
    return false;
  }
}
function feedbackView(gate, r, response, focus) {
  const f = r.feedback; const c = f.criteria || {};
  $('#app').innerHTML = `<div class="card">${taskHead(gate, ' · Feedback', focus)}
    <div class="split">
      <div>
        <div class="row between" style="align-items:flex-end"><div><span class="xs muted">Estimated band</span><div class="band">${f.band ?? '–'}</div></div>
        <div style="text-align:right"><span class="pill">${esc(f.cefr || '')}</span><div class="xs muted mt">${r.words} words${r.wpm ? ` · ${r.wpm} words/min` : ''}</div></div></div>
        <div class="mt">${critRow(gate.skill === 'speaking' ? 'Fluency' : 'Task', c.task)}${critRow('Coherence', c.coherence)}${critRow('Vocabulary', c.lexical)}${critRow('Grammar', c.grammar)}</div>
        <p>${esc(f.summary)}</p>
        ${f.strengths?.length ? `<div class="fb-section"><h3>What worked</h3>${f.strengths.map((s) => `<div class="small">· ${esc(s)}</div>`).join('')}</div>` : ''}
        <div class="fb-section"><h3>Corrections</h3><p class="xs dim" style="margin:-4px 0 8px">Saved to your error log.</p>
          <div class="list">${f.corrections?.length ? f.corrections.map((x) => `<div class="li"><div class="err-line"><span class="wrong">${esc(x.wrong)}</span> → <span class="right">${esc(x.correct)}</span></div><div class="xs muted">${esc(CATEGORIES[x.category]?.name || x.category)} · ${esc(x.explanation)}${CATEGORY_LESSON[x.category] ? ` · <a href="#" data-lesson="${CATEGORY_LESSON[x.category]}">Read the rule</a>` : ''}</div></div>`).join('') : '<p class="muted small">No major errors found.</p>'}</div>
        </div>
        ${f.next_focus ? `<div class="fb-section"><h3>Next focus</h3><p class="small" style="margin:0">${esc(f.next_focus)}</p></div>` : ''}
      </div>
      <div>
        <div class="fb-section" style="margin-top:0"><h3>Improved version</h3><div class="improved">${esc(f.upgraded_answer)}</div>
          <div class="row mt wrap"><button class="btn sm" id="f-listen">Listen</button><button class="btn sm ghost" id="f-slow">Listen slowly</button><button class="btn sm ghost" id="f-stop">Stop</button></div>
          <p class="xs muted">Shadow it: pause after each sentence and repeat it out loud with the same rhythm.</p></div>
        <div class="fb-section"><h3>Your answer</h3><div class="original pre small">${esc(response)}</div></div>
        ${f.phrases?.length ? `<div class="fb-section"><h3>New phrases</h3><p class="xs dim" style="margin:-4px 0 8px">Added to your phrase bank.</p>${f.phrases.map((p) => `<div class="small"><span style="font-weight:500">${esc(p.phrase)}</span> <span class="muted">— ${esc(p.meaning)}</span></div>`).join('')}</div>` : ''}
      </div>
    </div>
    <div class="row mt wrap"><button class="btn" id="f-again">Try another</button><button class="btn ghost" id="f-done">Back to today</button>
      ${partnerOf() && r.id ? `<button class="btn ghost" id="f-share">${icon('together')}Share with ${esc(partnerOf().name)}</button>` : ''}</div>
    <div id="f-share-box"></div></div>`;
  if ($('#f-share')) $('#f-share').onclick = () => {
    $('#f-share-box').innerHTML = `<div class="card wash mt"><label for="f-note">Add a note (optional)</label><input id="f-note" maxlength="200" placeholder="Can you check my second paragraph?" /><button class="btn sm mt" id="f-send">Share answer and feedback</button></div>`;
    $('#f-send').onclick = () => sendCheer(partnerOf().id, $('#f-note').value, 'share', r.id).then(() => { RUN = { view: 'practice', done: true, render: () => feedbackView(gate, r, response, focus) }; });
  };
  $('#f-listen').onclick = () => speak(f.upgraded_answer, 0.95);
  $('#f-slow').onclick = () => speak(f.upgraded_answer, 0.75);
  $('#f-stop').onclick = () => speechSynthesis.cancel();
  $('#f-again').onclick = () => { RUN = null; startTask(gate, focus); };
  $('#f-done').onclick = () => { speechSynthesis.cancel(); RUN = null; go('today'); };
  bindCommon();
}

// ---- Listen & Repeat ----
function lcsWords(a, b) {
  const m = a.length, n = b.length; const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const hit = new Array(m).fill(false); let i = m, j = n;
  while (i > 0 && j > 0) { if (a[i - 1] === b[j - 1]) { hit[i - 1] = true; i--; j--; } else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--; }
  return { score: m ? dp[m][n] / Math.max(m, n) : 0, hit };
}
function repeatRunner(gate, task) {
  const items = task.items; const results = []; let i = 0, plays = 0, rec = null, said = '', phase = 'listen';
  const t0 = Date.now();
  const self = {
    render() {
      if (i >= items.length) return self.finish();
      const target = items[i];
      $('#app').innerHTML = `<div class="runner-narrow"><div class="card">${taskHead(gate, ` · ${i + 1} of ${items.length}`)}
        <div class="steps">${items.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <p class="small muted">Listen, then repeat the sentence exactly. The text stays hidden — rely on your ears.</p>
        <div class="grid g-2 tight"><button class="btn" id="r-play">${plays ? 'Play again' : 'Play sentence'} · ${2 - plays} left</button>
        <button class="btn ${phase === 'rec' ? 'rec' : 'ghost'}" id="r-rec">${phase === 'rec' ? 'Stop' : 'Repeat it'}</button></div>
        <label>What you said</label><input id="r-said" value="${esc(said)}" placeholder="Speak, or type what you heard" />
        <button class="btn ghost full mt" id="r-check">Check</button>
        <div id="r-res"></div></div></div>`;
      $('#r-play').disabled = plays >= 2 || phase === 'rec';
      $('#r-play').onclick = async () => { plays++; self.render(); await speak(target, 0.92); };
      $('#r-said').oninput = (e) => { said = e.target.value; };
      $('#r-rec').onclick = () => {
        if (phase === 'rec') { rec.stop(); phase = 'listen'; setTimeout(() => self.render(), 350); return; }
        rec = new Recorder((t) => { said = t; const el = $('#r-said'); if (el) el.value = t; });
        if (rec.start('')) { said = ''; phase = 'rec'; self.render(); }
      };
      $('#r-check').onclick = () => {
        if (phase === 'rec') { rec.stop(); phase = 'listen'; }
        const a = norm(target).split(' '), b = norm(said).split(' ').filter(Boolean);
        const { score, hit } = lcsWords(a, b);
        results.push({ target, said, score });
        $('#r-res').innerHTML = `<div class="card wash mt" style="margin-bottom:0"><div class="diff">${target.split(/\s+/).map((w, k) => `<span class="${hit[k] ? 'ok' : 'miss'}">${esc(w)}</span>`).join(' ')}</div>
          <div class="row between mt"><span class="mid ${score >= 0.9 ? 'up' : score >= 0.6 ? '' : 'down'}">${Math.round(score * 100)}%</span><button class="btn sm" id="r-next">Next</button></div></div>`;
        $('#r-check').disabled = true; $('#r-rec').disabled = true;
        $('#r-next').onclick = () => { i++; plays = 0; said = ''; phase = 'listen'; self.render(); };
      };
    },
    async finish() {
      const avgScore = results.reduce((a, r) => a + r.score, 0) / results.length * 100;
      try {
        await api('/api/gate/local', { body: { date: today(), gate: gatePayload(gate), score: avgScore, seconds: Math.round((Date.now() - t0) / 1000), detail: results.map((x) => `${Math.round(x.score * 100)}% | ${x.target} | ${x.said}`).join('\n') }, retry: 1 });
        await refresh();
      } catch (e) { toast(esc(e.message), 'err'); }
      RUN = { view: 'practice', done: true, render: () => localResult(gate, avgScore, results.map((x) => `<div class="li small"><span class="${x.score >= 0.9 ? 'up' : ''}">${Math.round(x.score * 100)}%</span> ${esc(x.target)}<div class="xs muted">You: ${esc(x.said || '—')}</div></div>`).join('')) };
      render();
    },
  };
  return self;
}
function localResult(gate, score, detail) {
  $('#app').innerHTML = `<div class="runner-narrow"><div class="card">${taskHead(gate, ' · Result')}
    <span class="xs muted">Accuracy</span><div class="band">${Math.round(score)}%</div>
    <div class="list mt">${detail}</div>
    <div class="row mt"><button class="btn" id="l-again">Try another set</button><button class="btn ghost" id="l-done">Back to today</button></div></div></div>`;
  $('#l-again').onclick = () => { RUN = null; startTask(gate); };
  $('#l-done').onclick = () => { RUN = null; go('today'); };
}

// ---- Build a Sentence ----
function buildRunner(gate, task) {
  const items = task.items; let i = 0, picked = [], checked = false, correct = 0; const log = [];
  const t0 = Date.now(); let bank = [];
  const prep = () => { bank = shuffle(items[i].ans.split(' ').map((w, k) => ({ w, k }))); picked = []; checked = false; };
  prep();
  const self = {
    render() {
      if (i >= items.length) return self.finish();
      const it = items[i];
      $('#app').innerHTML = `<div class="runner-narrow"><div class="card">${taskHead(gate, ` · ${i + 1} of ${items.length}`)}
        <div class="steps">${items.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="question">A: ${esc(it.ctx)}<br>B: …</div>
        <label>Tap the words in order. Tap a placed word to remove it.</label>
        <div class="wordbank">${picked.map((p, k) => `<span class="word" data-rm="${k}">${esc(p.w)}</span>`).join('')}</div>
        <div class="wordbank" style="border-style:solid;background:var(--wash-a)">${bank.map((b, k) => `<span class="word ${picked.includes(b) ? 'used' : ''}" data-add="${k}">${esc(b.w)}</span>`).join('')}</div>
        <div id="b-res"></div>
        <button class="btn full mt" id="b-check" ${!checked && picked.length !== bank.length ? 'disabled' : ''}>${checked ? 'Next' : 'Check'}</button></div></div>`;
      if (!checked) {
        $$('[data-add]').forEach((el) => (el.onclick = () => { picked.push(bank[+el.dataset.add]); self.render(); }));
        $$('[data-rm]').forEach((el) => (el.onclick = () => { picked.splice(+el.dataset.rm, 1); self.render(); }));
      }
      $('#b-check').onclick = () => {
        if (checked) { i++; if (i < items.length) prep(); self.render(); return; }
        const ok = norm(picked.map((p) => p.w).join(' ')) === norm(it.ans);
        if (ok) correct++;
        log.push({ ok, ans: it.ans });
        checked = true; self.render();
        $('#b-res').innerHTML = `<p class="small ${ok ? 'up' : 'down'}" style="margin:6px 0 0">${ok ? 'Correct.' : `Not quite. Answer: <span class="right">${esc(it.ans)}</span>`}</p>`;
      };
    },
    async finish() {
      const score = (correct / items.length) * 100;
      try {
        await api('/api/gate/local', { body: { date: today(), gate: gatePayload(gate), score, seconds: Math.round((Date.now() - t0) / 1000), detail: log.map((l) => `${l.ok ? 'OK' : 'X'} ${l.ans}`).join('\n') }, retry: 1 });
        await refresh();
      } catch (e) { toast(esc(e.message), 'err'); }
      RUN = { view: 'practice', done: true, render: () => localResult(gate, score, log.map((l) => `<div class="li small"><span class="${l.ok ? 'up' : 'down'}">${l.ok ? 'Correct' : 'Missed'}</span> · ${esc(l.ans)}</div>`).join('')) };
      render();
    },
  };
  return self;
}

// ================= REVIEW =================
function vReview(D) {
  const tab = SUB.review || 'patterns';
  let body = '';
  if (tab === 'patterns') {
    body = `<div class="row wrap mb"><button class="btn" id="d-mixed">Drill my top patterns · 8 questions</button><span class="xs muted">Patterns are errors that appeared in the last 14 days. A pattern is fixed after 14 clean days.</span></div>
    <div class="grid g-2">${D.patterns.map((c) => `<div class="card"><div class="row between"><div><h3>${esc(CATEGORIES[c.key]?.name || c.key)}</h3><div class="xs muted">${esc(CATEGORIES[c.key]?.hint || '')}</div></div><span class="count">${c.recent}</span></div>
      <div class="mt">${c.examples.map((e) => `<div class="err-line"><span class="wrong">${esc(e.wrong)}</span> → <span class="right">${esc(e.correct)}</span></div>`).join('')}</div>
      <div class="row wrap mt">${CATEGORY_LESSON[c.key] ? `<button class="btn sm" data-lesson="${CATEGORY_LESSON[c.key]}">Read the rule</button>` : ''}${DRILLS[c.key] ? `<button class="btn sm ghost" data-drill="${c.key}">Drill this pattern</button>` : ''}</div></div>`).join('') || '<div class="card"><p class="muted" style="margin:0">No recurring errors in the last 14 days.</p></div>'}</div>
    ${D.cleared.length ? `<div class="card wash"><span class="label">Fixed — not seen for 14+ days</span><div class="pills mt">${D.cleared.map((c) => `<span class="pill">${esc(CATEGORIES[c.key]?.name || c.key)}</span>`).join('')}</div></div>` : ''}
    <div class="card"><span class="label">All drills · no AI needed</span><div class="pills mt">${Object.keys(DRILLS).map((k) => `<button class="pill" data-drill="${k}">${esc(CATEGORIES[k].name)}</button>`).join('')}</div></div>`;
  } else if (tab === 'log') {
    const f = SUB.errf || 'all';
    const list = S.errors.filter((e) => f === 'all' || e.category === f).slice(0, 200);
    body = `<div class="pills mb"><button class="pill ${f === 'all' ? 'on' : ''}" data-ef="all">All ${S.errors.length}</button>${Object.keys(CATEGORIES).filter((k) => S.errors.some((e) => e.category === k)).map((k) => `<button class="pill ${f === k ? 'on' : ''}" data-ef="${k}">${esc(CATEGORIES[k].name)}</button>`).join('')}</div>
    <div class="card"><table class="table"><thead><tr><th>Date</th><th>You wrote</th><th>Correct</th><th>Type and rule</th><th></th></tr></thead><tbody>
      ${list.map((e) => `<tr><td class="xs muted">${fmtDate(e.date)}</td><td><span class="wrong">${esc(e.wrong)}</span></td><td><span class="right">${esc(e.correct)}</span></td><td class="xs muted">${esc(CATEGORIES[e.category]?.name || e.category)}${e.explanation ? ' · ' + esc(e.explanation) : ''}</td><td><button class="btn sm ghost" data-del-err="${e.id}" aria-label="Delete">×</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Empty.</td></tr>'}
    </tbody></table></div>`;
  } else {
    body = `<div class="grid g-3"><div class="card ink"><span class="label">Due today</span><div class="big mt" style="color:var(--sky)">${D.due.length}</div>
      <button class="btn on-ink full mt" id="p-review" ${D.due.length ? '' : 'disabled'}>Start review</button>
      <p class="xs muted" style="margin:12px 0 0">Reviews space out: 1 → 3 → 7 → 14 → 30 → 60 days.</p></div>
    <div class="card span-2"><span class="label">Add a phrase</span>
      <div class="grid g-2 tight mt"><input id="p-phrase" maxlength="80" placeholder="play a key role in" /><input id="p-mean" maxlength="160" placeholder="Meaning or example" /></div>
      <button class="btn mt" id="p-add">Add phrase</button></div></div>
    <div class="card"><div class="card-head"><span class="label">All phrases</span><span class="xs dim">${S.phrases.length}</span></div>
      <table class="table"><thead><tr><th>Phrase</th><th>Meaning</th><th>Next review</th><th></th></tr></thead><tbody>
      ${S.phrases.map((p) => `<tr><td>${esc(p.phrase)} <button class="btn sm ghost" data-say="${esc(p.phrase)}" style="padding:2px 10px">Play</button></td><td class="small muted">${esc(p.meaning || '')}</td><td class="xs">${fmtDate(p.due)}</td><td><button class="btn sm ghost" data-del-ph="${p.id}" aria-label="Delete">×</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted small">Phrases from your feedback appear here automatically.</td></tr>'}
      </tbody></table></div>`;
  }
  $('#app').innerHTML = `${pageHead('Your errors and phrases', 'Review')}
    <div class="seg narrow-seg">${[['patterns', 'Patterns'], ['log', 'Error log'], ['phrases', `Phrases${D.due.length ? ' · ' + D.due.length : ''}`]].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>` + body;
  $$('[data-t]').forEach((b) => (b.onclick = () => { SUB.review = b.dataset.t; render(); }));
  $$('[data-ef]').forEach((b) => (b.onclick = () => { SUB.errf = b.dataset.ef; render(); }));
  $$('[data-drill]').forEach((b) => (b.onclick = () => startDrill([b.dataset.drill])));
  $('#d-mixed') && ($('#d-mixed').onclick = () => { const keys = D.patterns.map((c) => c.key).filter((k) => DRILLS[k]).slice(0, 4); startDrill(keys.length ? keys : ['article', 'verb_form', 'preposition']); });
  $$('[data-del-err]').forEach((b) => (b.onclick = async () => { if (!confirm('Delete this error? Only do this if the feedback was wrong.')) return; await api('/api/errors/' + b.dataset.delErr, { method: 'DELETE' }); await refresh(); render(); }));
  $$('[data-del-ph]').forEach((b) => (b.onclick = async () => { if (!confirm('Delete this phrase?')) return; await api('/api/phrases/' + b.dataset.delPh, { method: 'DELETE' }); await refresh(); render(); }));
  if ($('#p-add')) $('#p-add').onclick = async () => {
    const phrase = $('#p-phrase').value.trim(); if (!phrase) return toast('Enter a phrase first.', 'err');
    try { await api('/api/phrases', { body: { phrase, meaning: $('#p-mean').value, date: today() } }); toast('Phrase added.'); await refresh(); render(); } catch (e) { toast(esc(e.message), 'err'); }
  };
  if ($('#p-review')) $('#p-review').onclick = () => { RUN = phraseRunner(D.due); render(); };
}

function startDrill(keys) {
  const pool = keys.flatMap((k) => (DRILLS[k] || []).map((q) => ({ ...q, cat: k })));
  if (!pool.length) return;
  const qs = shuffle(pool).slice(0, Math.min(8, pool.length)).map((q) => { const order = shuffle(q.o.map((t, k) => ({ t, k }))); return { ...q, opts: order, ans: order.findIndex((x) => x.k === q.a) }; });
  let i = 0, right = 0, answered = false; const t0 = Date.now();
  RUN = {
    view: 'review',
    render() {
      if (i >= qs.length) return finish();
      const q = qs[i];
      $('#app').innerHTML = `<div class="runner-narrow"><div class="card"><div class="card-head"><span class="label"><span class="dot"></span>Error drill · ${esc(CATEGORIES[q.cat].name)}</span><span class="xs dim">${i + 1} of ${qs.length}</span></div>
        <div class="steps">${qs.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="question">${esc(q.q)}</div>
        <div class="opts">${q.opts.map((o, k) => `<button class="opt" data-o="${k}"><span class="opt-key">${'ABCD'[k]}</span>${esc(o.t)}</button>`).join('')}</div>
        <div id="dr-why" class="mt"></div>
        <div class="row mt"><button class="btn" id="dr-next" disabled>Next</button><button class="btn ghost" id="dr-quit">Finish</button></div></div></div>`;
      answered = false;
      const choose = (k) => {
        if (answered) return; answered = true;
        const ok = k === q.ans; if (ok) right++;
        $$('[data-o]')[k].classList.add(ok ? 'correct' : 'incorrect'); $$('[data-o]')[q.ans].classList.add('correct');
        $('#dr-why').innerHTML = `<div class="small ${ok ? 'up' : 'down'}">${ok ? 'Correct.' : 'Not quite.'}</div><div class="small muted">${esc(q.why)}</div>`;
        $('#dr-next').disabled = false; $('#dr-next').focus();
      };
      $$('[data-o]').forEach((b) => (b.onclick = () => choose(+b.dataset.o)));
      $('#dr-next').onclick = () => { i++; RUN.render(); };
      $('#dr-quit').onclick = () => { i = qs.length; RUN.render(); };
      keyHandler = (e) => { const k = 'abcd'.indexOf(e.key.toLowerCase()); if (k >= 0 && k < q.opts.length) choose(k); else if (e.key === 'Enter' && answered) { i++; RUN.render(); } };
    },
  };
  async function finish() {
    keyHandler = null;
    const mins = Math.max(1, Math.round(((Date.now() - t0) / 60000) * 10) / 10);
    RUN = null;
    toast(`Drill finished: ${right} of ${qs.length} correct.`);
    await logTime('debuff', mins, 'drill');
  }
  render();
}

function phraseRunner(due) {
  const list = shuffle(due).slice(0, 20); let i = 0, shown = false; const t0 = Date.now();
  return {
    view: 'review',
    render() {
      if (i >= list.length) return this.finish();
      const p = list[i];
      $('#app').innerHTML = `<div class="runner-narrow"><div class="card"><div class="card-head"><span class="label"><span class="dot"></span>Phrase review</span><span class="xs dim">${i + 1} of ${list.length}</span></div>
        <div class="question center" style="font-size:1.35rem;font-weight:300">${esc(p.phrase)}</div>
        <div class="row" style="justify-content:center"><button class="btn sm ghost" id="pr-say">Play</button></div>
        <p class="small muted center">Say a sentence of your own with this phrase, then reveal.</p>
        ${shown ? `<div class="improved center">${esc(p.meaning || 'No meaning saved')}</div><div class="row mt"><button class="btn ghost" style="flex:1" id="pr-again">Again soon</button><button class="btn" style="flex:1" id="pr-good">I knew it</button></div>`
        : '<button class="btn full" id="pr-show">Reveal</button>'}
        <button class="btn ghost full mt" id="pr-quit">Finish</button></div></div>`;
      $('#pr-say').onclick = () => speak(p.phrase);
      $('#pr-quit').onclick = () => { i = list.length; this.render(); };
      if (!shown) { $('#pr-show').onclick = () => { shown = true; this.render(); }; return; }
      const answer = async (ok) => { try { await api('/api/phrases/review', { body: { id: p.id, good: ok, date: today() } }); } catch (e) { toast(esc(e.message), 'err'); } i++; shown = false; this.render(); };
      $('#pr-again').onclick = () => answer(false);
      $('#pr-good').onclick = () => answer(true);
    },
    async finish() {
      RUN = null;
      const mins = Math.max(1, Math.round(((Date.now() - t0) / 60000) * 10) / 10);
      await logTime('phrases', mins, 'review');
    },
  };
}

// ================= TOGETHER =================
const partnerOf = () => (S.partners || []).find((p) => p.configured) || null;
function personSummary(isMe, D, p) {
  if (isMe) {
    const levels = Object.fromEntries(S.mastery.map((m) => [m.lesson_id, m.level]));
    return { id: S.user, name: S.name, streak: D.streak, todayMin: D.todayMin, daily: D.prof.daily, minimum: D.prof.minimum, weekMin: D.weekMin, weekTarget: D.weekTarget, learned: D.course.learned, levels, dayMap: D.dayMap, rows: S.settings, tests: S.tests, recent: S.attempts.slice(0, 6), errors: D.patterns.map((c) => ({ category: c.key, n: c.recent })), focus: D.prof.focus };
  }
  const v = partnerView(p);
  return { ...v, focus: v.prof.focus };
}
function vTogether(D) {
  const raw = partnerOf();
  if (!raw) {
    $('#app').innerHTML = `${pageHead('Study together', 'Together')}<div class="card"><h3>Your partner isn't set up yet</h3><p class="muted">${S.owner ? 'Set a starting passphrase for your partner in Settings › Study partner. Then they can choose their account on the cover.' : 'Ask Arief to finish setting up your account.'}</p>${S.owner ? '<button class="btn" data-go="settings">Open Settings</button>' : ''}</div>`;
    return;
  }
  const me = personSummary(true, D); const pa = personSummary(false, D, raw);
  const people = [me, pa];
  const goal = S.jointGoal || 5;
  const week = DAY_NAMES.map((n, i) => { const d = addDays(D.monday, i); return { n, d, met: people.map((x) => (x.dayMap[d] || 0) >= profileFor(d, x.rows).minimum) }; });
  const both = week.filter((w) => w.met.every(Boolean)).length;
  const notes = S.notes || [];
  const nameOf = (id) => (id === S.user ? 'You' : pa.name);
  const recentLine = (a) => `<div class="li row between"><div style="min-width:0"><div class="small">${esc(a.title)}</div><div class="xs muted">${fmtDate(a.date)} · ${esc(a.exam || '')}</div></div><span class="small w5">${a.band ? 'band ' + a.band : a.score != null ? Math.round(a.score) + '%' : ''}</span></div>`;
  const card = (x, isMe) => {
    const lastTest = (x.tests || []).filter((t) => t.source !== 'Estimate').slice(-1)[0] || (x.tests || []).slice(-1)[0];
    return `<div class="card person">
      <div class="row" style="gap:14px">${ring(x.todayMin / Math.max(1, x.daily), 64, 7, esc(x.name[0]), isMe ? '' : 'ring-partner')}
        <div><h3>${isMe ? 'You' : esc(x.name)}</h3><div class="small muted">${esc(FOCUS[x.focus] || '')}</div></div></div>
      <div class="stats mt"><div><div class="v">${x.streak}</div><div class="l">Day streak</div></div><div><div class="v">${Math.round(x.todayMin)}<span class="small">/${x.daily}</span></div><div class="l">Today (min)</div></div><div><div class="v">${hm(x.weekMin)}</div><div class="l">This week</div></div></div>
      <div class="sub-h">Grammar course · ${x.learned} of ${LESSONS.length} learned</div>
      <div class="mastery-strip">${LESSONS.map((l) => `<i class="lv${x.levels[l.id] || 0}" title="${esc(l.title)} · ${MASTERY[x.levels[l.id] || 0]}"></i>`).join('')}</div>
      <div class="sub-h">Latest checkpoint</div>
      ${lastTest ? `<div class="mini-scores">${SKILLS.map((k) => `<span class="k-${k}"><b>${lastTest[k]}</b>${cap(k)}</span>`).join('')}</div><div class="xs muted">${esc(lastTest.source)} · ${fmtDate(lastTest.date)}</div>` : `<p class="small muted" style="margin:0">${isMe ? 'No test recorded yet.' : (x.tests ? 'No test recorded yet.' : 'Kept private.')}</p>`}
      <div class="sub-h">Recent practice</div>
      <div class="list">${(x.recent || []).slice(0, 4).map(recentLine).join('') || '<p class="small muted" style="margin:0">Nothing yet.</p>'}</div>
      ${x.errors ? `<div class="sub-h">Mistakes to watch</div><div class="pills">${x.errors.slice(0, 4).map((e) => `<span class="pill">${esc(CATEGORIES[e.category]?.name || e.category)} · ${e.n}</span>`).join('') || '<span class="small muted">None in 14 days</span>'}</div>` : ''}
    </div>`;
  };
  $('#app').innerHTML = `${pageHead('Study together', `You and ${esc(pa.name)}`)}
  <div class="grid g-3">
    <div class="card span-2">
      <div class="card-head"><span class="label">Weekly goal together</span><span class="small"><b class="w5">${both}</b> of ${goal} days</span></div>
      <p class="small muted" style="margin:-4px 0 12px">A day counts when both of you reach your own streak minimum.</p>
      <div class="tg-grid">${people.map((x, pi) => `<span class="tg-name">${pi === 0 ? 'You' : esc(x.name)}</span>${week.map((w) => `<span class="tg-cell ${w.met[pi] ? 'on' : ''} ${w.d > D.t ? 'future' : ''} ${w.d === D.t ? 'today' : ''}" title="${fmtDate(w.d)}"></span>`).join('')}`).join('')}
        <span></span>${week.map((w) => `<span class="tg-day ${w.met.every(Boolean) ? 'both' : ''}">${w.n.slice(0, 2)}</span>`).join('')}</div>
      <div class="bar mt"><i style="width:${Math.min(100, (both / goal) * 100)}%"></i></div>
      <div class="row between mt"><span class="xs muted">${both >= goal ? 'Goal reached this week.' : `${goal - both} more day${goal - both > 1 ? 's' : ''} to reach your goal.`}</span>
        <span class="row"><span class="xs muted">Goal</span><button class="btn sm ghost" data-goal="-1" aria-label="Lower goal">−</button><b class="w5">${goal}</b><button class="btn sm ghost" data-goal="1" aria-label="Raise goal">+</button></span></div>
    </div>
    <div class="card">
      <span class="label">Say something</span>
      <button class="btn full mt" data-cheer="${pa.id}">${icon('heart')}Send ${esc(pa.name)} a cheer</button>
      <label for="tg-note">Short note</label><textarea id="tg-note" maxlength="400" style="min-height:84px" placeholder="Let's both finish the diagnostic tonight."></textarea>
      <button class="btn ghost full mt" id="tg-send">Send note</button>
    </div>
  </div>
  <div class="grid g-2">${card(me, true)}${card(pa, false)}</div>
  <div class="grid g-2">
    <div class="card"><div class="card-head"><span class="label">Messages</span><span class="xs dim">${notes.length}</span></div>
      <div class="list">${notes.slice(0, 20).map((n) => `<div class="li note ${n.to_user === S.user && !n.read_at ? 'unread' : ''}"><div class="row between"><span class="small"><b class="w5">${nameOf(n.from_user)}</b> ${n.kind === 'cheer' ? 'sent a cheer' : n.kind === 'share' ? 'shared an answer' : 'wrote'}</span><span class="xs dim">${fmtDate(wibDate(n.created_at))}</span></div>${n.text ? `<div class="small" style="margin-top:4px">${esc(n.text)}</div>` : ''}</div>`).join('') || '<p class="small muted" style="margin:0">No messages yet. A cheer is a nice start.</p>'}</div></div>
    <div class="card"><div class="card-head"><span class="label">Shared answers</span><span class="xs dim">from either of you</span></div>
      <div class="list">${(S.shared || []).map((a) => `<details class="li shared"><summary><div class="row between"><span><b class="w5">${a.user_id === S.user ? 'You' : esc(pa.name)}</b> · ${esc(a.title)}</span><span class="small">${a.band ? 'band ' + a.band : ''}</span></div>${a.note ? `<div class="xs muted">“${esc(a.note)}”</div>` : ''}</summary>
        <div class="xs muted mt">Task</div><div class="small pre">${esc(a.prompt)}</div>
        <div class="xs muted mt">Answer</div><div class="original pre small">${esc(a.response)}</div>
        ${a.feedback?.corrections?.length ? `<div class="xs muted mt">Corrections</div>${a.feedback.corrections.slice(0, 5).map((x) => `<div class="err-line small"><span class="wrong">${esc(x.wrong)}</span> → <span class="right">${esc(x.correct)}</span></div>`).join('')}` : ''}
        ${a.feedback?.upgraded_answer ? `<div class="xs muted mt">Improved version</div><div class="improved small">${esc(a.feedback.upgraded_answer)}</div>` : ''}
      </details>`).join('') || '<p class="small muted" style="margin:0">After AI feedback, use “Share with partner” to show an answer here.</p>'}</div></div>
  </div>
  <p class="xs muted">${esc(pa.name)} sees your streak, time, lessons, practice titles and messages. Checkpoint scores and mistakes follow each person's sharing settings.</p>`;
  $$('[data-cheer]').forEach((b) => (b.onclick = () => sendCheer(b.dataset.cheer)));
  $('#tg-send').onclick = () => { const t = $('#tg-note').value.trim(); if (!t) return toast('Write a short note first.', 'err'); sendCheer(pa.id, t, 'note'); };
  $$('[data-goal]').forEach((b) => (b.onclick = async () => { try { await api('/api/together/goal', { body: { days: Math.max(1, Math.min(7, goal + +b.dataset.goal)) } }); await refresh(); render(); } catch (e) { toast(esc(e.message), 'err'); } }));
  if (notes.some((n) => n.to_user === S.user && !n.read_at)) api('/api/notes/read', { body: {} }).then(() => refresh()).then(() => renderShell()).catch(() => {});
}

function vMore() {
  $('#app').innerHTML = `${pageHead('More', 'More')}
  <div class="list card">${[['review', 'Review', 'Your mistakes, drills and phrases'], ['progress', 'Progress', 'Checkpoints, estimated bands and milestones'], ['settings', 'Settings', 'Your plan, sharing and device check']].map(([k, l, d]) => `<button class="li more-item" data-go="${k}">${icon(k)}<span><b class="w5">${l}</b><span class="small muted">${d}</span></span></button>`).join('')}
    <button class="li more-item" id="m-switch">${icon('together')}<span><b class="w5">Switch account</b><span class="small muted">Back to the cover</span></span></button></div>`;
  $('#m-switch').onclick = switchAccount;
}

// ================= PROGRESS =================
function vProgress(D) {
  const tab = SUB.progress || 'checks';
  let body = '';
  if (tab === 'checks') {
    const done = (r) => S.tests.some((t) => t.source !== 'Estimate' && !t.id.startsWith('baseline') && t.date >= addDays(r.date, -3) && t.date <= addDays(r.date, 7));
    body = `<div class="grid g-3">
      <div class="card ink span-2">
        <div class="card-head"><span class="label">Progress toward your targets</span><span class="pill">${Math.max(0, daysBetween(D.t, D.prof.end))} days left</span></div>
        <div class="row between" style="align-items:flex-end"><div class="big" style="color:var(--sky)">${D.gapPct == null ? '–' : D.gapPct + '%'}</div><div class="small muted" style="text-align:right">${D.gapPct == null ? 'Record your first test below' : 'of the distance from your first test<br>to your targets is covered'}</div></div>
        <div class="bar mt"><i style="width:${Math.max(2, D.gapPct || 0)}%"></i></div>
        <div class="stats mt" style="padding-top:12px;border-top:0.5px solid var(--ink-line)"><div><div class="v">${D.gapPct == null ? '–' : D.gapLeft}</div><div class="l">Points to go</div></div><div><div class="v">${D.nextCheck ? daysBetween(D.t, D.nextCheck.date) : '–'}<span class="small">d</span></div><div class="l">Next checkpoint</div></div><div><div class="v">${D.course.masteryPct}%</div><div class="l">Grammar mastery</div></div></div>
      </div>
      <div class="card"><div class="card-head"><span class="label">Estimated bands</span><span class="xs dim">last 6 AI tasks</span></div>
        ${['speaking', 'writing'].map((sk) => { const c = D.crit[sk]; return `<div class="mb"><div class="row between small"><b class="w5">${cap(sk)}</b><span>${c.band ? (Math.round(c.band * 2) / 2).toFixed(1) : '–'}</span></div>${critRow(sk === 'speaking' ? 'Fluency' : 'Task', c.task)}${critRow('Coherence', c.coherence)}${critRow('Vocabulary', c.lexical)}${critRow('Grammar', c.grammar)}</div>`; }).join('')}
        <p class="xs dim" style="margin:0">IELTS-style estimates from AI feedback, not official scores.</p></div>
    </div>
    <div class="grid g-3">
      <div class="card span-2"><div class="card-head"><span class="label">Skill scores over time</span><span class="xs dim">dashed = your target</span></div>${chart(D)}</div>
      <div class="card"><div class="card-head"><span class="label">Checkpoint schedule</span></div>
        <div class="list">${RAIDS.map((r) => `<div class="li row between"><div><div>${esc(r.name)}</div><div class="xs muted">${fmtDate(r.date)} · EF SET 4-skill</div></div><span class="small ${done(r) ? 'up' : r.date < D.t ? 'down' : 'muted'}">${done(r) ? 'Done' : r.date < D.t ? 'Missed' : `in ${daysBetween(D.t, r.date)}d`}</span></div>`).join('')}</div>
        <a class="btn full mt" href="https://www.efset.org/4-skill" target="_blank" rel="noopener">Open EF SET ↗</a></div>
    </div>
    <div class="grid g-3">
      <div class="card"><div class="card-head"><span class="label">Record a result</span></div>
        <div class="grid g-2 tight"><div><label>Date</label><input id="t-date" type="date" value="${D.t}" /></div><div><label>Source</label><input id="t-src" value="EF SET" maxlength="40" /></div>
        ${SKILLS.map((k) => `<div><label>${cap(k)} (0–100)</label><input id="t-${k}" type="number" min="0" max="100" inputmode="numeric" /></div>`).join('')}</div>
        <label>Certificate link or note</label><input id="t-note" maxlength="200" placeholder="cert.efset.org/…" />
        <button class="btn full mt" id="t-save">Save result</button></div>
      <div class="card span-2"><div class="card-head"><span class="label">History</span></div>
        <table class="table"><thead><tr><th>Date</th><th>Source</th><th>Reading</th><th>Listening</th><th>Writing</th><th>Speaking</th><th>Overall</th><th></th></tr></thead><tbody>
        ${[...S.tests].reverse().map((t) => { const ov = Math.round((t.reading + t.listening + t.writing + t.speaking) / 4); return `<tr><td>${fmtDate(t.date)}</td><td>${esc(t.source)}${t.note ? `<div class="xs muted">${esc(t.note)}</div>` : ''}</td><td>${t.reading}</td><td>${t.listening}</td><td>${t.writing}</td><td>${t.speaking}</td><td>${ov} · ${cefrOf(ov)}</td><td>${t.id.startsWith('baseline') ? '' : `<button class="btn sm ghost" data-del-test="${t.id}">Delete</button>`}</td></tr>`; }).join('')}
        </tbody></table></div>
    </div>`;
  } else if (tab === 'platforms') {
    const last = {}; for (const q of S.quests) if (!last[q.ref] || q.date > last[q.ref]) last[q.ref] = q.date;
    body = `<p class="small muted" style="margin:0 2px 14px">Official or well-tested tools for what this app can't measure — especially pronunciation. Use the Today timer to log the minutes.</p>
    <div class="grid g-3">${SIDE_QUESTS.map((q) => { const l = last[q.key]; const ago = l ? daysBetween(l, D.t) : null; const dueQ = ago === null || ago >= q.every; return `<div class="card ${dueQ ? '' : 'wash'}"><div class="row between"><h3>${esc(q.name)}</h3><span class="pill">${dueQ ? 'Due' : `In ${q.every - ago}d`}</span></div>
      <p class="small muted">${esc(q.why)} Every ${q.every} days${l ? ` · last ${fmtDate(l)}` : ''}.</p>
      <div class="row"><a class="btn sm" href="${q.url}" target="_blank" rel="noopener">Open ↗</a><button class="btn sm ghost" data-sq="${q.key}" ${l === D.t ? 'disabled' : ''}>Mark done</button></div></div>`; }).join('')}</div>`;
  } else if (tab === 'partner-old') {
    const ps = (S.partners || []).map(partnerView);
    const me = { name: S.name, streak: D.streak, weekMin: D.weekMin, weekTarget: D.weekTarget, todayMin: D.todayMin, daily: D.prof.daily, learned: D.course.learned };
    body = ps.length ? `<div class="grid g-2">${[me, ...ps].map((p) => `<div class="card"><div class="row"><span class="avatar">${esc(p.name[0])}</span><b>${esc(p.name)}</b>${p.configured === false ? '<span class="pill">not set up yet</span>' : ''}</div>
      <div class="stats mt"><div><div class="v">${p.streak}</div><div class="l">Day streak</div></div><div><div class="v">${hm(p.weekMin)}</div><div class="l">This week</div></div><div><div class="v">${p.learned}/${LESSONS.length}</div><div class="l">Lessons learned</div></div></div>
      <div class="bar mt"><i style="width:${Math.min(100, (p.weekMin / Math.max(1, p.weekTarget)) * 100)}%"></i></div><div class="xs muted mt">Weekly target ${hm(p.weekTarget)} · today ${Math.round(p.todayMin)} / ${p.daily} min</div></div>`).join('')}</div>
      <p class="xs muted">Only streaks, time and lesson progress are shared. Answers, errors and scores stay private.</p>` : '<div class="card"><p class="muted" style="margin:0">No study partner yet.</p></div>';
  } else {
    const ms = milestones(D);
    body = `<div class="card"><div class="stats"><div><div class="v">${Math.round(D.totalMin / 60)}h</div><div class="l">Total trained</div></div><div><div class="v">${D.best}</div><div class="l">Best streak</div></div><div><div class="v">${D.fullDays}</div><div class="l">Full days</div></div></div></div>
    <div class="card"><div class="card-head"><span class="label">Milestones</span><span class="xs dim">${ms.filter((m) => m.got).length} of ${ms.length}</span></div>
      <div class="ms-grid">${ms.map((m) => `<div class="ms ${m.got ? 'got' : ''}"><div class="n">${esc(m.name)}</div><div class="d">${esc(m.desc)}</div></div>`).join('')}</div></div>`;
  }
  $('#app').innerHTML = `${pageHead('Checkpoints on the 17th of each month', 'Progress')}
    <div class="seg narrow-seg">${[['checks', 'Checkpoints'], ['platforms', 'Platforms'], ['ms', 'Milestones']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>` + body;
  $$('[data-t]').forEach((b) => (b.onclick = () => { SUB.progress = b.dataset.t; render(); }));
  if ($('#t-save')) $('#t-save').onclick = async () => {
    const b = { date: $('#t-date').value, source: $('#t-src').value, note: $('#t-note').value };
    for (const k of SKILLS) b[k] = $('#t-' + k).value;
    if (SKILLS.some((k) => b[k] === '')) return toast('Enter all four scores.', 'err');
    try { await api('/api/tests', { body: b }); toast('Result saved. Your skill scores are updated.', 'good'); await refresh(); render(); } catch (e) { toast(esc(e.message), 'err'); }
  };
  $$('[data-del-test]').forEach((b) => (b.onclick = async () => { if (!confirm('Delete this result?')) return; await api('/api/tests/' + b.dataset.delTest, { method: 'DELETE' }); await refresh(); render(); }));
  $$('[data-sq]').forEach((b) => (b.onclick = async () => { try { await api('/api/quests', { body: { date: today(), key: b.dataset.sq } }); toast('Marked as done.'); await refresh(); render(); } catch (e) { toast(esc(e.message), 'err'); } }));
}

function chart(D) {
  const tests = S.tests; if (!tests.length) return '<p class="muted">No data yet.</p>';
  const W = 760, H = 260, pad = { l: 44, r: 14, t: 12, b: 28 };
  const start = tests[0].date, end = D.prof.end; const span = Math.max(1, daysBetween(start, end));
  const x = (d) => pad.l + (Math.min(span, Math.max(0, daysBetween(start, d))) / span) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - 30) / 50) * (H - pad.t - pad.b);
  const colors = { speaking: '#052659', writing: '#7DB8EC', reading: '#9DBBDD', listening: '#475A75' };
  let g = '';
  for (const v of [41, 51, 61, 71]) g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(2,16,36,.08)"/><text x="2" y="${y(v) + 4}" fill="#7B8BA3" font-size="11" font-family="Outfit">${v} ${cefrOf(v)}</text>`;
  for (const k of Object.keys(colors)) {
    g += `<line x1="${x(start)}" x2="${x(end)}" y1="${y(D.prof.targets[k])}" y2="${y(D.prof.targets[k])}" stroke="${colors[k]}" stroke-dasharray="3 5" opacity=".55"/>`;
    const pts = tests.map((t) => `${x(t.date)},${y(Math.max(30, Math.min(80, t[k])))}`).join(' ');
    g += `<polyline points="${pts}" fill="none" stroke="${colors[k]}" stroke-width="2.5" stroke-linejoin="round"/>`;
    g += tests.map((t) => `<circle cx="${x(t.date)}" cy="${y(Math.max(30, Math.min(80, t[k])))}" r="4" fill="${colors[k]}"/>`).join('');
  }
  for (const r of RAIDS) g += `<text x="${x(r.date)}" y="${H - 6}" fill="#7B8BA3" font-size="11" font-family="Outfit" text-anchor="middle">${fmtDate(r.date)}</text>`;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Skill scores over time against targets">${g}</svg></div><div class="legend">${Object.entries(colors).map(([k, c]) => `<span><i style="background:${c}"></i>${cap(k)}</span>`).join('')}</div>`;
}

// ================= SETTINGS =================
function vSettings(D) {
  const p = D.prof;
  const sr = Recorder.supported(), tts = 'speechSynthesis' in window;
  const others = (S.partners || []);
  $('#app').innerHTML = `${pageHead('Your account', 'Settings')}
  <div class="grid g-2">
    <div class="card">
      <div class="card-head"><span class="label">Study plan</span><span class="xs dim">changes apply from today</span></div>
      <label>Display name</label><input id="st-name" maxlength="24" value="${esc(S.name)}" />
      <div class="grid g-2 tight">
        <div><label>Daily target (minutes)</label><input id="st-daily" type="number" min="15" max="180" step="5" value="${p.daily}" /></div>
        <div><label>Streak minimum (minutes)</label><input id="st-min" type="number" min="5" max="60" step="5" value="${p.minimum}" /></div>
      </div>
      <label>Rest days (up to 3 — they don't break your streak)</label>
      <div class="pills">${DAY_NAMES.map((n, i) => `<button class="pill ${(p.restDays || []).includes(i) ? 'on' : ''}" data-rest="${i}">${n}</button>`).join('')}</div>
      <label>Focus</label><select id="st-focus">${Object.entries(FOCUS).map(([k, v]) => `<option value="${k}" ${p.focus === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      <label>End date</label><input id="st-end" type="date" value="${p.end}" min="${addDays(D.t, 28)}" />
      <label>Target scores (EF SET 0–100)</label>
      <div class="grid g-2 tight">${SKILLS.map((k) => `<div><span class="xs muted">${cap(k)}</span><input id="st-t-${k}" type="number" min="20" max="100" value="${p.targets[k]}" /></div>`).join('')}</div>
      <p class="xs muted">Past days keep the target that was active then, so your history and streak stay honest. Skill scores themselves only change with a real test.</p>
      <button class="btn full" id="st-save">Save plan</button>
    </div>
    <div>
      <div class="card"><div class="card-head"><span class="label">Today with these settings</span></div>
        <div class="list">${Object.entries(D.blocks).map(([k, v]) => `<div class="li row between"><span>${esc(BLOCK_INFO[k]?.label || k)}</span><span class="small muted">${v} min</span></div>`).join('')}</div>
        <p class="xs muted" style="margin:10px 0 0">Phase ${D.phase.n} of 4 · ${fmtDate(D.phase.start)} – ${fmtDate(D.phase.end)}</p></div>
      <div class="card"><div class="card-head"><span class="label">Sharing with your partner</span></div>
        <label class="check-row"><input type="checkbox" id="sh-scores" ${p.share?.scores === false ? '' : 'checked'} /><span>Show my checkpoint scores</span></label>
        <label class="check-row"><input type="checkbox" id="sh-errors" ${p.share?.errors ? 'checked' : ''} /><span>Show my mistake patterns (categories only)</span></label>
        <p class="xs muted">Streaks, time, lessons, practice titles and messages are always shared. Saved with “Save plan”.</p></div>
      ${S.owner ? `<div class="card"><div class="card-head"><span class="label">Study partner</span></div>
        ${others.map((o) => `<div class="row between"><span class="row"><span class="avatar">${esc(o.name[0])}</span>${esc(o.name)}</span><span class="pill">${o.configured ? 'Active' : 'Waiting for a passphrase'}</span></div>
        <label for="pp-${o.id}">${o.configured ? `Reset ${esc(o.name)}'s passphrase` : `Starting passphrase for ${esc(o.name)}`}</label>
        <div class="row"><input id="pp-${o.id}" type="password" autocomplete="new-password" placeholder="At least 8 characters" /><button class="btn sm" data-pp="${o.id}">${o.configured ? 'Reset' : 'Set'}</button></div>`).join('')}
        <p class="xs muted">Tell ${others.map((o) => esc(o.name)).join(', ')} the passphrase in person. They can change it later in their own Settings.</p></div>` : ''}
      <div class="card"><div class="card-head"><span class="label">Device check</span></div>
        <div class="list"><div class="li row between"><span>Text-to-speech</span><span class="${tts ? 'up' : 'down'}">${tts ? 'Available' : 'Not available'}</span></div>
        <div class="li row between"><span>Speech recognition</span><span class="${sr ? 'up' : 'down'}">${sr ? 'Available' : 'Not available'}</span></div></div>
        <div class="grid g-2 tight mt"><button class="btn" id="c-tts">Test voice</button><button class="btn ghost" id="c-sr">Test microphone</button></div>
        <div class="improved mt" id="c-out" style="min-height:44px"><span class="muted small">Say "I'm practising English".</span></div>
        <p class="xs muted">iPhone: Safari, allow the microphone, keep Siri on. Samsung Tab: Chrome or Samsung Internet. Keyboard dictation always works as a fallback.</p></div>
      <div class="card"><div class="card-head"><span class="label">Passphrase and session</span></div>
        <div class="grid g-2 tight"><input id="pw-cur" type="password" placeholder="Current passphrase" autocomplete="current-password" /><input id="pw-new" type="password" placeholder="New passphrase" autocomplete="new-password" /></div>
        <div class="row wrap mt"><button class="btn ghost" id="pw-save">Change passphrase</button><button class="btn ghost" id="c-switch">Switch account</button><button class="btn danger" id="c-signout">Sign out on this device</button></div></div>
    </div>
  </div>`;
  let rest = [...(p.restDays || [])];
  $$('[data-rest]').forEach((b) => (b.onclick = () => { const d = +b.dataset.rest; rest = rest.includes(d) ? rest.filter((x) => x !== d) : rest.length < 3 ? [...rest, d] : rest; b.classList.toggle('on', rest.includes(d)); }));
  $('#st-save').onclick = async () => {
    const daily = +$('#st-daily').value;
    if (daily < p.daily && !confirm(`Lower your daily target from ${p.daily} to ${daily} minutes? A smaller target can make your March goal harder to reach.`)) return;
    const value = { daily, minimum: +$('#st-min').value, restDays: rest, focus: $('#st-focus').value, end: $('#st-end').value, targets: Object.fromEntries(SKILLS.map((k) => [k, +$('#st-t-' + k).value])), share: { scores: $('#sh-scores').checked, errors: $('#sh-errors').checked } };
    try { await api('/api/settings', { body: { date: D.t, value, name: $('#st-name').value } }); toast('Plan saved. It applies from today.', 'good'); await refresh(); renderShell(); render(); } catch (e) { toast(esc(e.message), 'err'); }
  };
  $$('[data-pp]').forEach((b) => (b.onclick = async () => {
    const id = b.dataset.pp; const v = $('#pp-' + id).value;
    if (v.length < 8) return toast('Use at least 8 characters.', 'err');
    try { await api('/api/partner/passphrase', { body: { user: id, passphrase: v } }); toast('Passphrase set. Your partner can sign in from the cover now.', 'good'); await refresh(); render(); } catch (e) { toast(esc(e.message), 'err'); }
  }));
  $('#c-switch').onclick = switchAccount;
  $('#c-tts').onclick = () => speak('Your device is ready. Let\'s practise.');
  let rec = null;
  $('#c-sr').onclick = () => {
    if (rec?.active) { rec.stop(); $('#c-sr').textContent = 'Test microphone'; $('#c-sr').className = 'btn ghost'; return; }
    rec = new Recorder((t) => { $('#c-out').textContent = t || '…'; });
    if (rec.start('')) { $('#c-sr').textContent = 'Stop'; $('#c-sr').className = 'btn rec'; }
  };
  $('#pw-save').onclick = async () => { try { await api('/api/auth/password', { body: { current: $('#pw-cur').value, next: $('#pw-new').value } }); toast('Passphrase changed. Other devices were signed out.', 'good'); $('#pw-cur').value = $('#pw-new').value = ''; } catch (e) { toast(esc(e.message), 'err'); } };
  $('#c-signout').onclick = async () => { try { await api('/api/auth/logout', { body: {} }); } catch { /* ignore */ } delete TOKENS[S.user]; saveTokens(); TOKEN = null; S = null; boot(); };
}

window.addEventListener('online', async () => { if (TOKEN && S && !RUN) { try { await refresh(); render(); } catch { /* ignore */ } } });
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && TOKEN && S && !RUN) { try { await refresh(); render(); } catch { /* ignore */ } }
});

boot();
