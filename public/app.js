// English Command — client app (vanilla JS, no build step)
import {
  CATEGORIES, DRILLS, GATES, makeTask, CHAPTERS, BLOCK_INFO, LISTENING_SOURCES,
  SIDE_QUESTS, RAIDS, TARGETS, END_DATE, LEVELS, PLAN_TASKS, BASELINE,
} from './content.js';
import { UNITS, LESSONS, LESSON, CATEGORY_LESSON } from './grammar.js';

// ================= utilities =================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtLong = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const mmss = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const hm = (min) => { const m = Math.round(min); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`; };
const words = (t) => (String(t).trim().match(/\S+/g) || []).length;
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
const cefrOf = (s) => (s >= 71 ? 'C2' : s >= 61 ? 'C1' : s >= 51 ? 'B2' : s >= 41 ? 'B1' : s >= 31 ? 'A2' : s >= 21 ? 'A1' : 'A0');
const SKILLS = ['speaking', 'writing', 'reading', 'listening'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
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

// ================= API =================
let TOKEN = store.get('eh_token');
async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(TOKEN ? { authorization: 'Bearer ' + TOKEN } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  if (res.status === 401 && !path.startsWith('/api/auth/')) { TOKEN = null; store.del('eh_token'); boot(); throw new Error('Your session expired. Sign in again.'); }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ================= derived state =================
const phaseOf = (d) => CHAPTERS.find((c) => d >= c.start && d <= c.end) || (d < CHAPTERS[0].start ? CHAPTERS[0] : CHAPTERS[CHAPTERS.length - 1]);
const GATE = Object.fromEntries(GATES.map((g) => [g.id, g]));
let S = null;
let VIEW = store.get('ec_view', 'home');
let SUB = {};
let RUN = null;

function derive() {
  const t = today();
  const dayMap = Object.fromEntries(S.days.map((d) => [d.date, d]));
  const todayMin = S.today.reduce((a, r) => a + (r.minutes || 0), 0);
  const actMin = Object.fromEntries(S.today.map((r) => [r.activity, r.minutes]));
  let streak = 0; let d = (dayMap[t]?.minutes || 0) >= 20 ? t : addDays(t, -1);
  while ((dayMap[d]?.minutes || 0) >= 20) { streak++; d = addDays(d, -1); }
  let best = 0, run = 0, prev = null;
  for (const day of S.days) {
    if ((day.minutes || 0) >= 20) { run = prev && daysBetween(prev, day.date) === 1 ? run + 1 : 1; prev = day.date; best = Math.max(best, run); }
  }
  const fullDays = S.days.filter((x) => (x.minutes || 0) >= 90).length;
  const totalMin = S.days.reduce((a, x) => a + (x.minutes || 0), 0);
  const dow = (new Date(t + 'T00:00:00Z').getUTCDay() + 6) % 7;
  const monday = addDays(t, -dow);
  const weekMin = S.days.filter((x) => x.date >= monday && x.date <= t).reduce((a, x) => a + (x.minutes || 0), 0);
  const latest = S.tests[S.tests.length - 1] || null;
  // gap closed: share of the baseline → target gap already closed
  let gapTotal = 0, gapLeft = 0;
  for (const k of SKILLS) {
    const base = BASELINE[k], tgt = TARGETS[k], cur = latest ? latest[k] : base;
    if (tgt > base) { gapTotal += tgt - base; gapLeft += Math.max(0, tgt - cur); }
    else if (cur < tgt) gapLeft += tgt - cur;
  }
  const gapPct = gapTotal ? Math.max(0, Math.min(100, Math.round(((gapTotal - gapLeft) / gapTotal) * 100))) : 100;
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
  const bestBand = { speaking: 0, writing: 0 };
  for (const g of S.gateStats) { const gd = GATE[g.gate_id]; if (gd && g.best_band) bestBand[gd.skill] = Math.max(bestBand[gd.skill], g.best_band); }
  const nextCheck = RAIDS.find((r) => r.date >= t) || null;
  const doneLessons = new Set((S.lessons || []).map((l) => l.id));
  const nextLesson = LESSONS.find((l) => !doneLessons.has(l.id)) || null;
  return { doneLessons, nextLesson, t, dayMap, todayMin, actMin, streak, best, fullDays, totalMin, weekMin, monday, latest, gapPct, gapLeft, patterns, cleared, due, bestBand, nextCheck, phase: phaseOf(t) };
}

function milestones(D) {
  const n = S.attempts.length;
  const ov = D.latest ? (D.latest.reading + D.latest.listening + D.latest.writing + D.latest.speaking) / 4 : 0;
  const hrs = D.totalMin / 60;
  const bb = Math.max(D.bestBand.speaking, D.bestBand.writing);
  return [
    ['First session', 'Complete one practice task', n >= 1],
    ['First lesson', 'Pass one grammar lesson', D.doneLessons.size >= 1],
    ['Foundations', 'Pass all lessons in Units 1–3', LESSONS.filter((l) => ['u1', 'u2', 'u3'].includes(l.unit)).every((l) => D.doneLessons.has(l.id))],
    ['Syllabus complete', 'Pass every grammar lesson', D.doneLessons.size >= LESSONS.length],
    ['First full day', 'Train 90 minutes in one day', D.fullDays >= 1],
    ['One week steady', '7-day streak', D.best >= 7],
    ['One month steady', '30-day streak', D.best >= 30],
    ['10 full days', '10 days of 90 minutes', D.fullDays >= 10],
    ['25 hours', '25 hours trained', hrs >= 25],
    ['100 hours', '100 hours trained', hrs >= 100],
    ['Band 6.0', 'Estimated band 6.0 on a task', bb >= 6],
    ['Band 6.5', 'Estimated band 6.5 on a task', bb >= 6.5],
    ['Band 7.0', 'Estimated band 7.0 on a task', bb >= 7],
    ['Pattern fixed', 'An error pattern gone for 14 days', D.cleared.length >= 1],
    ['50 phrases', 'Phrase bank reaches 50', S.phrases.length >= 50],
    ['First checkpoint', 'Record your first retest', S.tests.length >= 2],
    ['Speaking B2', 'Speaking 51+ on a real test', (D.latest?.speaking || 0) >= 51],
    ['Writing B2', 'Writing 51+ on a real test', (D.latest?.writing || 0) >= 51],
    ['C1 overall', 'Overall 61+ on a real test', ov >= 61],
  ].map(([name, desc, got]) => ({ name, desc, got }));
}

function planTasks(D) {
  const idx = Math.max(0, daysBetween(CHAPTERS[0].start, D.t));
  const p = PLAN_TASKS[D.phase.n];
  return { speaking: GATE[p.speaking[idx % p.speaking.length]], writing: GATE[p.writing[idx % p.writing.length]] };
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
      this.interim = interim;
      this.onText(this.text());
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
      if (this.active) setTimeout(() => this._spawn(), 200);
      else { this.onText(this.text()); this.onState(false); }
    };
    this.rec = r;
    try { r.start(); } catch { /* already started */ }
  }
  text() { return (this.prefix + this.base + this.final + this.interim).replace(/\s+/g, ' ').trimStart(); }
  stop() { const secs = (Date.now() - (this.t0 || Date.now())) / 1000; this.active = false; try { this.rec?.stop(); } catch { /* ignore */ } return secs; }
}

// ================= boot / auth =================
async function boot() {
  $('#topbar').hidden = true; $('#nav').hidden = true;
  if (!TOKEN) {
    let configured = true;
    try { configured = (await api('/api/auth/status')).configured; } catch (e) { $('#app').innerHTML = `<div class="card auth"><h2>Can't connect</h2><p class="muted">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Try again</button></div>`; return; }
    return renderAuth(configured);
  }
  try { await refresh(); } catch (e) { if (TOKEN) $('#app').innerHTML = `<div class="card auth"><h2>Something went wrong</h2><p class="muted">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Try again</button></div>`; return; }
  $('#topbar').hidden = false; $('#nav').hidden = false;
  render();
}

function renderAuth(configured) {
  $('#app').innerHTML = `
  <div class="auth">
    <div class="page-head"><span class="label"><span class="dot"></span>${configured ? 'Welcome back' : 'First-time setup'}</span><h1>English<br><span class="muted">Command</span></h1></div>
    <div class="card">
      ${configured ? '' : '<label>Your name</label><input id="a-name" maxlength="24" value="Arief" autocomplete="nickname" />'}
      <label>Passphrase</label><input id="a-pass" type="password" autocomplete="${configured ? 'current-password' : 'new-password'}" placeholder="At least 8 characters" />
      ${configured ? '' : '<label>Confirm passphrase</label><input id="a-pass2" type="password" autocomplete="new-password" />'}
      <button id="a-go" class="btn full mt">${configured ? 'Sign in' : 'Create passphrase'}</button>
      ${configured ? '' : '<p class="xs muted mt">The first person to open this page sets the passphrase, so do it right after deploying.</p>'}
    </div>
  </div>`;
  const go = async () => {
    const pass = $('#a-pass').value;
    try {
      if (!configured) {
        if (pass !== $('#a-pass2').value) return toast('Passphrases don\'t match.', 'err');
        TOKEN = (await api('/api/auth/setup', { body: { passphrase: pass, name: $('#a-name').value } })).token;
      } else {
        TOKEN = (await api('/api/auth/login', { body: { passphrase: pass } })).token;
      }
      store.set('eh_token', TOKEN);
      boot();
    } catch (e) { toast(esc(e.message), 'err'); }
  };
  $('#a-go').onclick = go;
  $('#a-pass').onkeydown = (e) => { if (e.key === 'Enter' && configured) go(); };
}

let PREV = null;
async function refresh() {
  S = await api('/api/state?date=' + today());
  const D = derive();
  const got = milestones(D).filter((m) => m.got).map((m) => m.name);
  if (PREV) {
    got.filter((n) => !PREV.ms.includes(n)).forEach((n) => toast(`Milestone reached: <b style="font-weight:500">${esc(n)}</b>`, 'good'));
    if (PREV.todayMin < 90 && D.todayMin >= 90) toast('Today\'s 90 minutes are done. Well trained.', 'good');
    else if (PREV.todayMin < 20 && D.todayMin >= 20) toast('20 minutes done — your streak is safe today.');
  }
  PREV = { todayMin: D.todayMin, ms: got };
  $('#ai-chip').textContent = `AI ${S.mana.max - S.mana.used}`;
}

// ================= navigation =================
const leaveOk = () => !RUN || RUN.done || confirm('Leave this task? Your answer here won\'t be saved.');
$$('#nav button').forEach((b) => (b.onclick = () => { if (!leaveOk()) return; RUN = null; if ('speechSynthesis' in window) speechSynthesis.cancel(); go(b.dataset.view); }));
$('#btn-settings').onclick = () => { if (!leaveOk()) return; RUN = null; go('settings'); };
function go(view) { VIEW = view; if (view !== 'settings') store.set('ec_view', view); render(); window.scrollTo(0, 0); }
function render() {
  if (!S) return;
  $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === VIEW));
  if (RUN) return RUN.render();
  const D = derive();
  const views = { home: vHome, today: vToday, learn: vLearn, practice: vPractice, review: vReview, progress: vProgress, settings: vSettings };
  (views[VIEW] || vHome)(D);
}
function bindGo() { $$('[data-go]').forEach((b) => (b.onclick = () => { if (b.dataset.sub) SUB[b.dataset.go] = b.dataset.sub; go(b.dataset.go); })); }
function bindStart() { $$('[data-start]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); startTask(GATE[b.dataset.start]); })); }
const greeting = () => { const h = +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date()); return h < 11 ? 'Good morning' : h < 15 ? 'Good afternoon' : 'Good evening'; };

// ================= HOME =================
function heatmap(D) {
  const start = addDays(D.monday, -21);
  let cells = '';
  for (let i = 0; i < 28; i++) {
    const d = addDays(start, i); const m = D.dayMap[d]?.minutes || 0;
    const cls = d > D.t ? '' : m >= 90 ? 'l3' : m >= 20 ? 'l2' : m > 0 ? 'l1' : '';
    cells += `<i class="${cls} ${d === D.t ? 'today' : ''}" title="${fmtDate(d)} · ${Math.round(m)} min" style="${d > D.t ? 'opacity:.35' : ''}"></i>`;
  }
  return `<div class="heat-days">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span>${x}</span>`).join('')}</div><div class="heat">${cells}</div>
  <div class="legend"><span><i style="background:var(--sky-soft)"></i>Under 20 min</span><span><i style="background:var(--sky)"></i>20+ min</span><span><i style="background:var(--ink)"></i>90 min</span></div>`;
}

function vHome(D) {
  const daysLeft = Math.max(0, daysBetween(D.t, END_DATE));
  const qpct = Math.min(100, (D.todayMin / 90) * 100);
  const plan = planTasks(D);
  $('#app').innerHTML = `
  <div class="page-head">
    <span class="label"><span class="dot"></span>Phase ${D.phase.n} · ${esc(D.phase.name)}</span>
    <h1>${greeting()},<br><span class="muted">${esc(S.name)}</span></h1>
  </div>

  <div class="card ink">
    <div class="card-head"><span class="label">Work-abroad readiness</span><span class="pill">${daysLeft} days left</span></div>
    <div class="row between" style="align-items:flex-end"><div class="big" style="color:var(--sky)">${D.gapPct}%</div><div class="small muted" style="text-align:right">of the gap to your<br>March targets closed</div></div>
    <div class="bar mt"><i style="width:${Math.max(2, D.gapPct)}%"></i></div>
    <div class="stats mt" style="padding-top:12px;border-top:0.5px solid var(--ink-line)">
      <div><div class="v">${D.gapLeft}</div><div class="l">Points to go</div></div>
      <div><div class="v">${D.nextCheck ? daysBetween(D.t, D.nextCheck.date) : '–'}<span class="small">d</span></div><div class="l">Next checkpoint</div></div>
      <div><div class="v">${D.streak}</div><div class="l">Day streak</div></div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><span class="label"><span class="num">01</span>Today</span><span class="small muted">${Math.round(D.todayMin)} / 90 min</span></div>
    <div class="bar"><i style="width:${qpct}%"></i><span class="mark" style="left:${(20 / 90) * 100}%"></span></div>
    <p class="small muted" style="margin:10px 0 0">${D.todayMin >= 90 ? 'Done for today. Anything extra is a bonus.' : D.todayMin >= 20 ? 'Streak is safe. Keep going toward 90 minutes.' : '20 minutes keeps your streak. 90 minutes completes the day.'}</p>
    <div class="row mt wrap"><button class="btn" data-go="today">Open today's plan</button>${D.nextLesson ? `<button class="btn ghost" data-lesson="${D.nextLesson.id}">Lesson · ${esc(D.nextLesson.title)}</button>` : ''}</div>
  </div>

  <div class="card">
    <div class="card-head"><span class="label"><span class="num">02</span>Skills · ${D.latest ? esc(D.latest.source) + ', ' + fmtDate(D.latest.date) : 'no test yet'}</span><span class="xs dim">line = target</span></div>
    ${D.latest ? SKILLS.map((k) => {
      const v = D.latest[k], b = BASELINE[k], dl = v - b, tg = TARGETS[k];
      return `<div class="skill"><div class="skill-top"><span>${cap(k)} <span class="dim xs">${cefrOf(v)}</span></span><span>${v}${dl ? ` <span class="${dl > 0 ? 'up' : 'down'} xs">${dl > 0 ? '+' : ''}${dl}</span>` : ''} <span class="dim">/ ${tg}</span></span></div>
      <div class="bar"><i style="width:${v}%"></i><span class="mark" style="left:${tg}%"></span></div></div>`;
    }).join('') : '<p class="muted">Record a test in Progress.</p>'}
    <p class="xs dim" style="margin:12px 0 0">Scores change only after a real test (checkpoint). Practice estimates never overwrite them.</p>
  </div>

  <div class="card">
    <div class="card-head"><span class="label"><span class="num">03</span>Consistency</span><span class="small muted">This week ${hm(D.weekMin)} / 10h 30m</span></div>
    ${heatmap(D)}
  </div>

  <div class="grid2">
    <div class="card" style="margin-bottom:14px"><span class="label">Best speaking band</span><div class="mid mt">${D.bestBand.speaking || '–'}</div><span class="xs dim">from AI-scored practice</span></div>
    <div class="card" style="margin-bottom:14px"><span class="label">Best writing band</span><div class="mid mt">${D.bestBand.writing || '–'}</div><span class="xs dim">from AI-scored practice</span></div>
  </div>

  <div class="card">
    <div class="card-head"><span class="label"><span class="num">04</span>Error patterns · last 14 days</span></div>
    <div class="list">${D.patterns.slice(0, 3).map((c) => `<div class="li row between"><div><div>${esc(CATEGORIES[c.key]?.name || c.key)}</div><div class="xs muted">${esc(CATEGORIES[c.key]?.hint || '')}</div></div><span class="count">${c.recent}</span></div>`).join('') || '<p class="muted small" style="margin:0">No recurring errors in the last 14 days.</p>'}</div>
    ${D.patterns.length ? '<button class="btn ghost full mt" data-go="review">Review and drill</button>' : ''}
  </div>`;
  bindGo(); bindStart(); bindLesson();
}

// ================= TODAY =================
let TIMER = store.get('eh_timer');
function vToday(D) {
  const plan = planTasks(D);
  const blocks = Object.entries(D.phase.blocks);
  const doneCount = blocks.filter(([k, tg]) => (D.actMin[k] || 0) >= tg).length;
  const action = (k) => {
    if (k === 'speaking' || k === 'writing') return `<button class="btn sm" data-start="${plan[k].id}">Start · ${esc(plan[k].title)}</button><button class="btn sm ghost" data-go="practice" data-sub="${k}">Choose another</button>`;
    if (k === 'grammar') return D.nextLesson ? `<button class="btn sm" data-lesson="${D.nextLesson.id}">Next lesson · ${esc(D.nextLesson.title)}</button><button class="btn sm ghost" data-go="learn">Syllabus</button>` : '<button class="btn sm" data-go="learn">Review a lesson</button>';
    if (k === 'debuff') return '<button class="btn sm" id="go-drill">Start drill</button>';
    if (k === 'phrases') return `<button class="btn sm" data-go="review" data-sub="phrases">Review ${D.due.length} due</button>`;
    return `<button class="btn sm" data-timer="${k}">Start timer</button>`;
  };
  $('#app').innerHTML = `
  <div class="page-head"><span class="label"><span class="dot"></span>${fmtLong(D.t)}</span><h1>Today's <span class="hl">plan</span></h1></div>
  <div class="card ink">
    <div class="row between"><span>${doneCount} of ${blocks.length} done</span><span style="color:var(--sky)">${Math.round(D.todayMin)} / 90 min</span></div>
    <div class="bar mt"><i style="width:${Math.min(100, (D.todayMin / 90) * 100)}%"></i><span class="mark" style="left:${(20 / 90) * 100}%"></span></div>
    <p class="xs muted" style="margin:10px 0 0">Any order, any time of day. 20 minutes keeps your streak.</p>
  </div>
  <div class="card"><div class="list">
    ${blocks.map(([k, tg]) => {
      const done = D.actMin[k] || 0; const ok = done >= tg;
      return `<div class="li"><div class="row" style="align-items:flex-start"><span class="check ${ok ? 'on' : ''}"></span><div style="flex:1;min-width:0">
        <div class="row between"><span>${esc(BLOCK_INFO[k].label)}</span><span class="small ${ok ? 'up' : 'muted'}">${Math.round(done)} / ${tg} min</span></div>
        <div class="xs muted">${esc(BLOCK_INFO[k].note)}</div>
        <div class="row wrap mt">${action(k)}</div></div></div></div>`;
    }).join('')}
  </div></div>
  <div class="card" id="timer-card"></div>
  <div class="card">
    <div class="card-head"><span class="label">Listening sources</span></div>
    <div class="list">${LISTENING_SOURCES.map((s) => `<div class="li"><a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)} ↗</a></div>`).join('')}</div>
    <p class="xs muted" style="margin:12px 0 0">Listen once for meaning, then replay sentence by sentence and repeat out loud, copying the rhythm.</p>
  </div>
  <div class="card">
    <div class="card-head"><span class="label">Log time manually</span></div>
    <div class="grid2">
      <div><label>Activity</label><select id="m-act">${Object.keys(BLOCK_INFO).map((k) => `<option value="${k}">${esc(BLOCK_INFO[k].label)}</option>`).join('')}<option value="other">Other English practice</option></select></div>
      <div><label>Minutes</label><input id="m-min" type="number" min="1" max="180" inputmode="numeric" placeholder="20" /></div>
    </div>
    <button class="btn full mt" id="m-log">Log time</button>
  </div>`;
  bindStart(); bindGo(); bindLesson();
  $$('[data-timer]').forEach((b) => (b.onclick = () => startTimer(b.dataset.timer)));
  $('#go-drill') && ($('#go-drill').onclick = () => { const keys = D.patterns.map((c) => c.key).filter((k) => DRILLS[k]).slice(0, 4); startDrill(keys.length ? keys : ['article', 'verb_form', 'preposition']); });
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
  if (!TIMER) { el.innerHTML = '<div class="card-head" style="margin:0"><span class="label">Timer</span><span class="xs dim">For listening, platforms or reading</span></div>'; return; }
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
async function logTime(activity, minutes, type = 'study', count = 0) {
  try {
    await api('/api/event', { body: { date: today(), type, activity, minutes, count } });
    toast(`Logged ${minutes} min · ${esc(BLOCK_INFO[activity]?.label || 'Practice')}`);
    await refresh(); render();
  } catch (e) { toast(esc(e.message), 'err'); }
}

// ================= PRACTICE =================
function vPractice(D) {
  const stats = Object.fromEntries(S.gateStats.map((g) => [g.gate_id, g]));
  const filt = SUB.practice || 'all';
  const list = GATES.filter((g) => filt === 'all' || g.skill === filt);
  const plan = planTasks(D);
  let n = 0;
  $('#app').innerHTML = `
  <div class="page-head"><span class="label"><span class="dot"></span>${GATES.length} task types · IELTS and TOEFL</span><h1>Practice, <span class="hl">get feedback</span></h1></div>
  <div class="seg">${['all', 'speaking', 'writing'].map((k) => `<button data-f="${k}" class="${filt === k ? 'on' : ''}">${cap(k)}</button>`).join('')}</div>
  ${'EDCBAS'.split('').map((r) => {
    const gs = list.filter((g) => g.rank === r); if (!gs.length) return '';
    return `<div class="label" style="margin:18px 2px 10px"><span class="num">${String(++n).padStart(2, '0')}</span>${LEVELS[r]}</div>
    ${gs.map((g) => {
      const st = stats[g.id]; const suggested = g.id === plan.speaking.id || g.id === plan.writing.id;
      return `<div class="card task-card ${suggested ? 'ink' : ''}" data-start="${g.id}" style="cursor:pointer">
        <span class="lvl">${String(GATES.indexOf(g) + 1).padStart(2, '0')}</span>
        <div class="pills" style="gap:5px"><span class="pill">${esc(g.exam)} · ${g.skill}</span>${suggested ? '<span class="pill">Suggested today</span>' : ''}</div>
        <h3>${esc(g.title)}</h3>
        <div class="small muted">${esc(g.desc)}</div>
        <div class="xs dim mt">~${g.mins} min · ${g.mode === 'ai' ? 'AI feedback' : 'scored on device'}${st ? ` · done ${st.clears}×${st.best_band ? ` · best band ${st.best_band}` : ''}${st.best_score != null ? ` · best ${Math.round(st.best_score)}%` : ''}` : ''}</div>
      </div>`;
    }).join('')}`;
  }).join('')}`;
  $$('[data-f]').forEach((b) => (b.onclick = () => { SUB.practice = b.dataset.f; render(); }));
  bindStart();
}

function startTask(gate) {
  if (!gate) return;
  if (gate.mode === 'ai' && S.mana.used >= S.mana.max) return toast('Today\'s 30 AI feedback requests are used up. They reset at 07:00 WIB. Device-scored tasks and drills still work.', 'err');
  const task = makeTask(gate);
  if (gate.mode === 'repeat') RUN = repeatRunner(gate, task);
  else if (gate.mode === 'build') RUN = buildRunner(gate, task);
  else if (gate.skill === 'speaking') RUN = speakingRunner(gate, task);
  else RUN = writingRunner(gate, task);
  render(); window.scrollTo(0, 0);
}
function exitRun() { RUN = null; render(); }
const taskHead = (gate, extra = '') => `<div class="card-head"><span class="label"><span class="dot"></span>${esc(gate.exam)} · ${LEVELS[gate.rank]}${extra}</span></div><h2 style="margin-bottom:12px">${esc(gate.title)}</h2>`;
const gatePayload = (g) => ({ id: g.id, rank: g.rank, skill: g.skill, exam: g.exam, title: g.title });

// ---- Speaking (AI) ----
function speakingRunner(gate, task) {
  const qs = task.questions;
  const limits = task.limits || qs.map(() => gate.perQ || 60);
  const answers = qs.map(() => ''); const secs = qs.map(() => 0);
  const needsPrep = (k) => (gate.prep && k === 0) || task.prepAt === k;
  let i = 0, phase = needsPrep(0) ? 'prep' : 'ready', rec = null, tick = null, t0 = 0;
  const self = {
    render() {
      clearInterval(tick);
      const q = qs[i];
      $('#app').innerHTML = `<div class="card">${taskHead(gate, ` · ${i + 1} of ${qs.length}`)}
        ${task.header ? `<div class="small muted mb">${esc(task.header)}</div>` : ''}
        <div class="steps">${qs.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="question">${esc(q)}</div>
        <div class="row between mb"><button class="btn sm ghost" id="s-hear">Hear the question</button><span class="xs muted">Limit ${mmss(limits[i])}</span></div>
        ${phase === 'prep' ? `<p class="small muted">Preparation: jot down keywords only. Speaking starts when the timer ends.</p><div class="timer" id="s-timer">${mmss(60)}</div><textarea id="s-notes" placeholder="Notes (not submitted)" style="min-height:90px"></textarea><button class="btn full mt" id="s-skip">I'm ready</button>`
        : `<div class="timer" id="s-timer">${mmss(limits[i])}</div>
        <button class="btn full mt ${phase === 'rec' ? 'rec' : ''}" id="s-rec">${phase === 'rec' ? 'Stop recording' : answers[i] ? 'Record more' : 'Start speaking'}</button>
        <label>Transcript — fix recognition mistakes only, not your grammar</label>
        <textarea id="s-text" placeholder="${Recorder.supported() ? 'Your words appear here as you speak…' : 'Voice input unavailable: tap here and use your keyboard microphone.'}">${esc(answers[i])}</textarea>
        <div class="row between mt"><span class="xs muted" id="s-wc">${words(answers[i])} words</span>
        <button class="btn" id="s-next" ${phase === 'rec' ? 'disabled' : ''}>${i < qs.length - 1 ? 'Next question' : 'Get feedback'}</button></div>`}
        <button class="btn ghost full mt" id="s-quit">Leave task</button></div>`;
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
        await submitAI(gate, prompt, response, Math.round(secs.reduce((a, b) => a + b, 0)), 'Each answer was spoken; time limits per question: ' + limits.map(mmss).join(', '));
      };
    },
  };
  return self;
}

// ---- Writing (AI) ----
function writingRunner(gate, task) {
  const key = 'eh_draft_' + gate.id;
  const saved = store.get(key);
  const prompt = saved?.prompt || task.prompt;
  let text = saved?.text || '';
  const t0 = saved?.t0 || Date.now();
  store.set(key, { prompt, text, t0 });
  let tick = null;
  const limit = gate.mins * 60;
  const self = {
    render() {
      clearInterval(tick);
      $('#app').innerHTML = `<div class="card">${taskHead(gate)}
        <div class="question">${esc(prompt)}</div>
        <div class="row between"><span class="xs muted">${gate.mins} min · ${gate.minWords}+ words${gate.strict ? ' · locks at 0:00' : ''}</span><span class="timer" id="w-timer" style="font-size:1.5rem">${mmss(limit)}</span></div>
        <textarea id="w-text" style="min-height:300px" spellcheck="false" autocorrect="off" autocapitalize="sentences" placeholder="Write here. Spellcheck is off, as in the real exam.">${esc(text)}</textarea>
        <div class="row between mt"><span class="small" id="w-wc"></span><button class="btn" id="w-submit">Get feedback</button></div>
        <div class="row mt"><button class="btn ghost sm" id="w-new">New prompt</button><button class="btn ghost sm" id="w-quit">Save draft and leave</button></div></div>`;
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
      $('#w-new').onclick = () => { if (ta.value.trim() && !confirm('Discard this draft and get a new prompt?')) return; store.del(key); RUN = writingRunner(gate, makeTask(gate)); render(); };
      $('#w-quit').onclick = () => { clearInterval(tick); toast('Draft saved on this device.'); exitRun(); };
      $('#w-submit').onclick = async () => {
        if (words(ta.value) < gate.minWords * 0.5 && !confirm('This is much shorter than required, which lowers the band. Submit anyway?')) return;
        clearInterval(tick);
        const ok = await submitAI(gate, prompt, ta.value, Math.round(Math.min(7200, (Date.now() - t0) / 1000)), `Minimum length ${gate.minWords} words; time limit ${gate.mins} minutes.`);
        if (ok) store.del(key);
      };
    },
  };
  return self;
}

async function submitAI(gate, prompt, response, seconds, note) {
  $('#app').innerHTML = `<div class="card center" style="padding:40px 18px"><span class="label"><span class="dot" style="animation:pulse 1.2s infinite"></span>Reviewing your answer</span><p class="muted small">Grammar, vocabulary, coherence and task response. About 15 seconds.</p></div>`;
  try {
    const r = await api('/api/gate/ai', { body: { date: today(), gate: gatePayload(gate), prompt, response, seconds, note } });
    await refresh();
    RUN = { done: true, render: () => feedbackView(gate, r, response) };
    render(); window.scrollTo(0, 0);
    return true;
  } catch (e) {
    toast(esc(e.message), 'err');
    RUN && RUN.render();
    return false;
  }
}

function feedbackView(gate, r, response) {
  const f = r.feedback;
  $('#app').innerHTML = `<div class="card">${taskHead(gate, ' · Feedback')}
    <div class="row between" style="align-items:flex-end"><div><span class="xs muted">Estimated band</span><div class="band">${f.band ?? '–'}</div></div>
    <div style="text-align:right"><span class="pill">${esc(f.cefr || '')}</span><div class="xs muted mt">${r.words} words${r.wpm ? ` · ${r.wpm} words/min` : ''}</div></div></div>
    <p>${esc(f.summary)}</p>
    ${f.strengths?.length ? `<div class="fb-section"><h3>What worked</h3>${f.strengths.map((s) => `<div class="small">· ${esc(s)}</div>`).join('')}</div>` : ''}
    <div class="fb-section"><h3>Corrections</h3><p class="xs dim" style="margin:-4px 0 8px">Saved to your error log.</p>
      <div class="list">${f.corrections?.length ? f.corrections.map((c) => `<div class="li"><div class="err-line"><span class="wrong">${esc(c.wrong)}</span> → <span class="right">${esc(c.correct)}</span></div><div class="xs muted">${esc(CATEGORIES[c.category]?.name || c.category)} · ${esc(c.explanation)}${CATEGORY_LESSON[c.category] ? ` · <a href="#" data-lesson="${CATEGORY_LESSON[c.category]}">Read the rule</a>` : ''}</div></div>`).join('') : '<p class="muted small">No major errors found.</p>'}</div>
    </div>
    <div class="fb-section"><h3>Improved version</h3><div class="improved">${esc(f.upgraded_answer)}</div>
      <div class="row mt wrap"><button class="btn sm" id="f-listen">Listen</button><button class="btn sm ghost" id="f-slow">Listen slowly</button><button class="btn sm ghost" id="f-stop">Stop</button></div>
      <p class="xs muted">Shadow it: pause after each sentence and repeat it out loud with the same rhythm.</p></div>
    ${f.phrases?.length ? `<div class="fb-section"><h3>New phrases</h3><p class="xs dim" style="margin:-4px 0 8px">Added to your phrase bank.</p>${f.phrases.map((p) => `<div class="small"><span style="font-weight:500">${esc(p.phrase)}</span> <span class="muted">— ${esc(p.meaning)}</span></div>`).join('')}</div>` : ''}
    ${f.next_focus ? `<div class="fb-section"><h3>Next focus</h3><p class="small" style="margin:0">${esc(f.next_focus)}</p></div>` : ''}
    <details class="mt"><summary class="small muted">Your original answer</summary><div class="pre small mt">${esc(response)}</div></details>
    <div class="row mt"><button class="btn" id="f-again">Try another</button><button class="btn ghost" id="f-done">Done</button></div></div>`;
  $('#f-listen').onclick = () => speak(f.upgraded_answer, 0.95);
  $('#f-slow').onclick = () => speak(f.upgraded_answer, 0.75);
  $('#f-stop').onclick = () => speechSynthesis.cancel();
  $('#f-again').onclick = () => { RUN = null; startTask(gate); };
  $('#f-done').onclick = () => { speechSynthesis.cancel(); RUN = null; go('today'); };
  bindLesson();
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
      $('#app').innerHTML = `<div class="card">${taskHead(gate, ` · ${i + 1} of ${items.length}`)}
        <div class="steps">${items.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <p class="small muted">Listen, then repeat the sentence exactly. The text stays hidden — rely on your ears.</p>
        <button class="btn full" id="r-play">${plays ? 'Play again' : 'Play sentence'} · ${2 - plays} left</button>
        <button class="btn full mt ${phase === 'rec' ? 'rec' : 'ghost'}" id="r-rec">${phase === 'rec' ? 'Stop' : 'Repeat it'}</button>
        <label>What you said</label><input id="r-said" value="${esc(said)}" placeholder="Speak, or type what you heard" />
        <button class="btn ghost full mt" id="r-check">Check</button>
        <div id="r-res"></div></div>`;
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
      const avg = results.reduce((a, r) => a + r.score, 0) / results.length * 100;
      try {
        await api('/api/gate/local', { body: { date: today(), gate: gatePayload(gate), score: avg, seconds: Math.round((Date.now() - t0) / 1000), detail: results.map((x) => `${Math.round(x.score * 100)}% | ${x.target} | ${x.said}`).join('\n') } });
        await refresh();
        RUN = { done: true, render: () => localResult(gate, avg, results.map((x) => `<div class="li small"><span class="${x.score >= 0.9 ? 'up' : ''}">${Math.round(x.score * 100)}%</span> ${esc(x.target)}<div class="xs muted">You: ${esc(x.said || '—')}</div></div>`).join('')) };
        render();
      } catch (e) { toast(esc(e.message), 'err'); exitRun(); }
    },
  };
  return self;
}
function localResult(gate, score, detail) {
  $('#app').innerHTML = `<div class="card">${taskHead(gate, ' · Result')}
    <span class="xs muted">Accuracy</span><div class="band">${Math.round(score)}%</div>
    <div class="list mt">${detail}</div>
    <div class="row mt"><button class="btn" id="l-again">Try another set</button><button class="btn ghost" id="l-done">Done</button></div></div>`;
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
      $('#app').innerHTML = `<div class="card">${taskHead(gate, ` · ${i + 1} of ${items.length}`)}
        <div class="steps">${items.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="question">A: ${esc(it.ctx)}<br>B: …</div>
        <label>Tap the words in order. Tap a placed word to remove it.</label>
        <div class="wordbank">${picked.map((p, k) => `<span class="word" data-rm="${k}">${esc(p.w)}</span>`).join('')}</div>
        <div class="wordbank" style="border-style:solid;background:var(--wash-a)">${bank.map((b, k) => `<span class="word ${picked.includes(b) ? 'used' : ''}" data-add="${k}">${esc(b.w)}</span>`).join('')}</div>
        <div id="b-res"></div>
        <button class="btn full mt" id="b-check" ${!checked && picked.length !== bank.length ? 'disabled' : ''}>${checked ? 'Next' : 'Check'}</button></div>`;
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
        await api('/api/gate/local', { body: { date: today(), gate: gatePayload(gate), score, seconds: Math.round((Date.now() - t0) / 1000), detail: log.map((l) => `${l.ok ? 'OK' : 'X'} ${l.ans}`).join('\n') } });
        await refresh();
        RUN = { done: true, render: () => localResult(gate, score, log.map((l) => `<div class="li small"><span class="${l.ok ? 'up' : 'down'}">${l.ok ? 'Correct' : 'Missed'}</span> · ${esc(l.ans)}</div>`).join('')) };
        render();
      } catch (e) { toast(esc(e.message), 'err'); exitRun(); }
    },
  };
  return self;
}

// ================= REVIEW =================
function vReview(D) {
  const tab = SUB.review || 'patterns';
  let body = '';
  if (tab === 'patterns') {
    body = `<button class="btn full mb" id="d-mixed">Drill my top patterns · 8 questions</button>
    ${D.patterns.map((c) => `<div class="card"><div class="row between"><div><h3>${esc(CATEGORIES[c.key]?.name || c.key)}</h3><div class="xs muted">${esc(CATEGORIES[c.key]?.hint || '')}</div></div><span class="count">${c.recent}</span></div>
      <div class="mt">${c.examples.map((e) => `<div class="err-line"><span class="wrong">${esc(e.wrong)}</span> → <span class="right">${esc(e.correct)}</span></div>`).join('')}</div>
      <div class="row wrap mt">${CATEGORY_LESSON[c.key] ? `<button class="btn sm" data-lesson="${CATEGORY_LESSON[c.key]}">Read the rule</button>` : ''}${DRILLS[c.key] ? `<button class="btn sm ghost" data-drill="${c.key}">Drill this pattern</button>` : ''}</div></div>`).join('') || '<div class="card"><p class="muted" style="margin:0">No recurring errors in the last 14 days.</p></div>'}
    ${D.cleared.length ? `<div class="card wash"><span class="label">Fixed — not seen for 14+ days</span><div class="pills mt">${D.cleared.map((c) => `<span class="pill">${esc(CATEGORIES[c.key]?.name || c.key)}</span>`).join('')}</div></div>` : ''}
    <div class="card"><span class="label">All drills · no AI needed</span><div class="pills mt">${Object.keys(DRILLS).map((k) => `<button class="pill" data-drill="${k}">${esc(CATEGORIES[k].name)}</button>`).join('')}</div></div>`;
  } else if (tab === 'log') {
    const f = SUB.errf || 'all';
    const list = S.errors.filter((e) => f === 'all' || e.category === f).slice(0, 150);
    body = `<div class="pills mb"><button class="pill ${f === 'all' ? 'on' : ''}" data-ef="all">All ${S.errors.length}</button>${Object.keys(CATEGORIES).filter((k) => S.errors.some((e) => e.category === k)).map((k) => `<button class="pill ${f === k ? 'on' : ''}" data-ef="${k}">${esc(CATEGORIES[k].name)}</button>`).join('')}</div>
    <div class="card"><div class="list">${list.map((e) => `<div class="li"><div class="row between" style="align-items:flex-start"><div class="err-line"><span class="wrong">${esc(e.wrong)}</span> → <span class="right">${esc(e.correct)}</span></div><button class="btn sm ghost" data-del-err="${e.id}" aria-label="Delete">×</button></div><div class="xs muted">${fmtDate(e.date)} · ${esc(CATEGORIES[e.category]?.name || e.category)}${e.explanation ? ' · ' + esc(e.explanation) : ''}</div></div>`).join('') || '<p class="muted" style="margin:0">Empty.</p>'}</div></div>`;
  } else {
    body = `<div class="card ink"><div class="row between"><div><span class="label">Due today</span><div class="big mt" style="color:var(--sky)">${D.due.length}</div></div><button class="btn on-ink" id="p-review" ${D.due.length ? '' : 'disabled'}>Start review</button></div>
      <p class="xs muted" style="margin:12px 0 0">Reviews space out: 1 → 3 → 7 → 14 → 30 → 60 days. Say each phrase in your own sentence.</p></div>
    <div class="card"><span class="label">Add a phrase</span>
      <input id="p-phrase" class="mt" maxlength="80" placeholder="play a key role in" /><input id="p-mean" class="mt" maxlength="160" placeholder="Meaning or example" />
      <button class="btn full mt" id="p-add">Add phrase</button></div>
    <div class="card"><div class="card-head"><span class="label">All phrases</span><span class="xs dim">${S.phrases.length}</span></div><div class="list">
      ${S.phrases.map((p) => `<div class="li"><div class="row between" style="align-items:flex-start"><div><span>${esc(p.phrase)}</span> <button class="btn sm ghost" data-say="${esc(p.phrase)}" style="padding:2px 10px">Play</button><div class="xs muted">${esc(p.meaning || '')}</div><div class="xs dim">Next review ${fmtDate(p.due)}</div></div><button class="btn sm ghost" data-del-ph="${p.id}" aria-label="Delete">×</button></div></div>`).join('') || '<p class="muted small" style="margin:0">Phrases from your feedback appear here automatically.</p>'}
    </div></div>`;
  }
  $('#app').innerHTML = `<div class="page-head"><span class="label"><span class="dot"></span>Your errors and phrases</span><h1>Review</h1></div>
    <div class="seg">${[['patterns', 'Patterns'], ['log', 'Error log'], ['phrases', `Phrases${D.due.length ? ' · ' + D.due.length : ''}`]].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>` + body;
  $$('[data-t]').forEach((b) => (b.onclick = () => { SUB.review = b.dataset.t; render(); }));
  $$('[data-ef]').forEach((b) => (b.onclick = () => { SUB.errf = b.dataset.ef; render(); }));
  $$('[data-drill]').forEach((b) => (b.onclick = () => startDrill([b.dataset.drill])));
  bindLesson();
  $('#d-mixed') && ($('#d-mixed').onclick = () => { const keys = D.patterns.map((c) => c.key).filter((k) => DRILLS[k]).slice(0, 4); startDrill(keys.length ? keys : ['article', 'verb_form', 'preposition']); });
  $$('[data-del-err]').forEach((b) => (b.onclick = async () => { if (!confirm('Delete this error? Only do this if the feedback was wrong.')) return; await api('/api/errors/' + b.dataset.delErr, { method: 'DELETE' }); await refresh(); render(); }));
  $$('[data-del-ph]').forEach((b) => (b.onclick = async () => { if (!confirm('Delete this phrase?')) return; await api('/api/phrases/' + b.dataset.delPh, { method: 'DELETE' }); await refresh(); render(); }));
  $$('[data-say]').forEach((b) => (b.onclick = () => speak(b.dataset.say)));
  if ($('#p-add')) $('#p-add').onclick = async () => {
    const phrase = $('#p-phrase').value.trim(); if (!phrase) return toast('Enter a phrase first.', 'err');
    try { await api('/api/phrases', { body: { phrase, meaning: $('#p-mean').value, date: today() } }); toast('Phrase added.'); await refresh(); render(); } catch (e) { toast(esc(e.message), 'err'); }
  };
  if ($('#p-review')) $('#p-review').onclick = () => { RUN = phraseRunner(D.due); render(); };
}

function startDrill(keys) {
  const pool = keys.flatMap((k) => (DRILLS[k] || []).map((q) => ({ ...q, cat: k })));
  if (!pool.length) return;
  const qs = shuffle(pool).slice(0, Math.min(8, pool.length)).map((q) => {
    const order = shuffle(q.o.map((t, k) => ({ t, k })));
    return { ...q, opts: order, ans: order.findIndex((x) => x.k === q.a) };
  });
  let i = 0, right = 0, answered = false; const t0 = Date.now();
  RUN = {
    render() {
      if (i >= qs.length) return finish();
      const q = qs[i];
      $('#app').innerHTML = `<div class="card"><div class="card-head"><span class="label"><span class="dot"></span>Error drill · ${esc(CATEGORIES[q.cat].name)}</span><span class="xs dim">${i + 1} of ${qs.length}</span></div>
        <div class="steps">${qs.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="question">${esc(q.q)}</div>
        <div class="opts">${q.opts.map((o, k) => `<button class="opt" data-o="${k}">${esc(o.t)}</button>`).join('')}</div>
        <div id="dr-why" class="mt"></div>
        <div class="row mt"><button class="btn" id="dr-next" disabled>Next</button><button class="btn ghost" id="dr-quit">Finish</button></div></div>`;
      answered = false;
      $$('[data-o]').forEach((b) => (b.onclick = () => {
        if (answered) return; answered = true;
        const k = +b.dataset.o; const ok = k === q.ans; if (ok) right++;
        b.classList.add(ok ? 'correct' : 'incorrect'); $$('[data-o]')[q.ans].classList.add('correct');
        $('#dr-why').innerHTML = `<div class="small ${ok ? 'up' : 'down'}">${ok ? 'Correct.' : 'Not quite.'}</div><div class="small muted">${esc(q.why)}</div>`;
        $('#dr-next').disabled = false;
      }));
      $('#dr-next').onclick = () => { i++; RUN.render(); };
      $('#dr-quit').onclick = () => { i = qs.length; RUN.render(); };
    },
  };
  async function finish() {
    const mins = Math.max(1, Math.round(((Date.now() - t0) / 60000) * 10) / 10);
    RUN = null;
    toast(`Drill finished: ${right} of ${qs.length} correct.`);
    await logTime('debuff', mins, 'drill', right);
  }
  render();
}

function phraseRunner(due) {
  const list = shuffle(due).slice(0, 20); let i = 0, shown = false, good = 0; const t0 = Date.now();
  return {
    render() {
      if (i >= list.length) return this.finish();
      const p = list[i];
      $('#app').innerHTML = `<div class="card"><div class="card-head"><span class="label"><span class="dot"></span>Phrase review</span><span class="xs dim">${i + 1} of ${list.length}</span></div>
        <div class="question center" style="font-size:1.35rem;font-weight:300">${esc(p.phrase)}</div>
        <div class="row" style="justify-content:center"><button class="btn sm ghost" id="pr-say">Play</button></div>
        <p class="small muted center">Say a sentence of your own with this phrase, then reveal.</p>
        ${shown ? `<div class="improved center">${esc(p.meaning || 'No meaning saved')}</div><div class="row mt"><button class="btn ghost" style="flex:1" id="pr-again">Again soon</button><button class="btn" style="flex:1" id="pr-good">I knew it</button></div>`
        : '<button class="btn full" id="pr-show">Reveal</button>'}
        <button class="btn ghost full mt" id="pr-quit">Finish</button></div>`;
      $('#pr-say').onclick = () => speak(p.phrase);
      $('#pr-quit').onclick = () => { i = list.length; this.render(); };
      if (!shown) { $('#pr-show').onclick = () => { shown = true; this.render(); }; return; }
      const answer = async (ok) => { try { await api('/api/phrases/review', { body: { id: p.id, good: ok, date: today() } }); } catch (e) { toast(esc(e.message), 'err'); } if (ok) good++; i++; shown = false; this.render(); };
      $('#pr-again').onclick = () => answer(false);
      $('#pr-good').onclick = () => answer(true);
    },
    async finish() {
      RUN = null;
      const mins = Math.max(1, Math.round(((Date.now() - t0) / 60000) * 10) / 10);
      await logTime('phrases', mins, 'review', good);
    },
  };
}

// ================= PROGRESS =================
function vProgress(D) {
  const tab = SUB.progress || 'checks';
  let body = '';
  if (tab === 'checks') {
    const done = (r) => S.tests.some((t) => t.id !== 'baseline-efset' && t.date >= addDays(r.date, -3) && t.date <= addDays(r.date, 7));
    body = `<div class="card"><div class="card-head"><span class="label"><span class="num">01</span>Skill scores over time</span><span class="xs dim">dashed = target</span></div>${chart()}</div>
    <div class="card"><div class="card-head"><span class="label"><span class="num">02</span>Checkpoint schedule</span></div>
      <div class="list">${RAIDS.map((r) => `<div class="li row between"><div><div>${esc(r.name)}</div><div class="xs muted">${fmtDate(r.date)} · EF SET 4-skill, 90 min</div></div><span class="small ${done(r) ? 'up' : r.date < D.t ? 'down' : 'muted'}">${done(r) ? 'Done' : r.date < D.t ? 'Missed' : `in ${daysBetween(D.t, r.date)} days`}</span></div>`).join('')}</div>
      <a class="btn full mt" href="https://www.efset.org/4-skill" target="_blank" rel="noopener">Open EF SET ↗</a></div>
    <div class="card"><div class="card-head"><span class="label"><span class="num">03</span>Record a result</span></div>
      <div class="grid2"><div><label>Date</label><input id="t-date" type="date" value="${D.t}" /></div><div><label>Source</label><input id="t-src" value="EF SET" maxlength="40" /></div></div>
      <div class="grid2">${SKILLS.map((k) => `<div><label>${cap(k)} (0–100)</label><input id="t-${k}" type="number" min="0" max="100" inputmode="numeric" /></div>`).join('')}</div>
      <label>Certificate link or note</label><input id="t-note" maxlength="200" placeholder="cert.efset.org/…" />
      <button class="btn full mt" id="t-save">Save result</button></div>
    <div class="card"><div class="card-head"><span class="label"><span class="num">04</span>History</span></div><div class="list">${[...S.tests].reverse().map((t) => { const ov = Math.round((t.reading + t.listening + t.writing + t.speaking) / 4); return `<div class="li"><div class="row between"><span>${fmtDate(t.date)} · ${esc(t.source)}</span><span>${ov} · ${cefrOf(ov)}</span></div><div class="xs muted">Reading ${t.reading} · Listening ${t.listening} · Writing ${t.writing} · Speaking ${t.speaking}${t.note ? ' · ' + esc(t.note) : ''}</div>${t.id !== 'baseline-efset' ? `<button class="btn sm ghost mt" data-del-test="${t.id}">Delete</button>` : ''}</div>`; }).join('')}</div></div>`;
  } else if (tab === 'platforms') {
    const last = {}; for (const q of S.quests) if (!last[q.ref] || q.date > last[q.ref]) last[q.ref] = q.date;
    body = `<p class="small muted" style="margin:0 2px 14px">Official or well-tested tools for what this app can't measure — especially pronunciation. Use the Today timer to log the minutes.</p>
    ${SIDE_QUESTS.map((q) => { const l = last[q.key]; const ago = l ? daysBetween(l, D.t) : null; const dueQ = ago === null || ago >= q.every; return `<div class="card ${dueQ ? '' : 'wash'}"><div class="row between"><h3>${esc(q.name)}</h3><span class="pill">${dueQ ? 'Due' : `In ${q.every - ago} days`}</span></div>
      <p class="small muted">${esc(q.why)} Every ${q.every} days${l ? ` · last ${fmtDate(l)}` : ''}.</p>
      <div class="row"><a class="btn sm" href="${q.url}" target="_blank" rel="noopener">Open ↗</a><button class="btn sm ghost" data-sq="${q.key}" ${l === D.t ? 'disabled' : ''}>Mark done</button></div></div>`; }).join('')}`;
  } else {
    const ms = milestones(D);
    body = `<div class="card"><div class="stats">
      <div><div class="v">${Math.round(D.totalMin / 60)}h</div><div class="l">Total trained</div></div>
      <div><div class="v">${D.best}</div><div class="l">Best streak</div></div>
      <div><div class="v">${D.fullDays}</div><div class="l">Full 90-min days</div></div></div></div>
    <div class="card"><div class="card-head"><span class="label">Milestones</span><span class="xs dim">${ms.filter((m) => m.got).length} of ${ms.length}</span></div>
      <div class="ms-grid">${ms.map((m) => `<div class="ms ${m.got ? 'got' : ''}"><div class="n">${esc(m.name)}</div><div class="d">${esc(m.desc)}</div></div>`).join('')}</div></div>`;
  }
  $('#app').innerHTML = `<div class="page-head"><span class="label"><span class="dot"></span>Checkpoints every 17th</span><h1>Progress</h1></div>
    <div class="seg">${[['checks', 'Checkpoints'], ['platforms', 'Platforms'], ['ms', 'Milestones']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>` + body;
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

function chart() {
  const tests = S.tests; if (!tests.length) return '<p class="muted">No data yet.</p>';
  const W = 600, H = 240, pad = { l: 40, r: 12, t: 12, b: 26 };
  const start = tests[0].date, end = END_DATE; const span = Math.max(1, daysBetween(start, end));
  const x = (d) => pad.l + (daysBetween(start, d) / span) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - 30) / 50) * (H - pad.t - pad.b);
  const colors = { speaking: '#052659', writing: '#7DB8EC', reading: '#9DBBDD', listening: '#475A75' };
  let g = '';
  for (const v of [41, 51, 61, 71]) g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(2,16,36,.08)"/><text x="2" y="${y(v) + 4}" fill="#7B8BA3" font-size="11" font-family="Outfit">${v} ${cefrOf(v)}</text>`;
  for (const k of Object.keys(colors)) {
    g += `<line x1="${x(start)}" x2="${x(end)}" y1="${y(TARGETS[k])}" y2="${y(TARGETS[k])}" stroke="${colors[k]}" stroke-dasharray="3 5" opacity=".5"/>`;
    const pts = tests.map((t) => `${x(t.date)},${y(Math.max(30, Math.min(80, t[k])))}`).join(' ');
    g += `<polyline points="${pts}" fill="none" stroke="${colors[k]}" stroke-width="2.5" stroke-linejoin="round"/>`;
    g += tests.map((t) => `<circle cx="${x(t.date)}" cy="${y(Math.max(30, Math.min(80, t[k])))}" r="4" fill="${colors[k]}"/>`).join('');
  }
  for (const r of RAIDS) g += `<text x="${x(r.date)}" y="${H - 6}" fill="#7B8BA3" font-size="11" font-family="Outfit" text-anchor="middle">${fmtDate(r.date)}</text>`;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Skill scores over time against targets">${g}</svg></div><div class="legend">${Object.entries(colors).map(([k, c]) => `<span><i style="background:${c}"></i>${cap(k)}</span>`).join('')}</div>`;
}

// ================= LEARN (grammar syllabus) =================
function bindLesson() { $$('[data-lesson]').forEach((b) => (b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openLesson(b.dataset.lesson); })); }

function vLearn(D) {
  const done = D.doneLessons;
  const recommended = [...new Set(D.patterns.map((c) => CATEGORY_LESSON[c.key]).filter(Boolean))].filter((id) => !done.has(id)).slice(0, 2);
  const pct = Math.round((done.size / LESSONS.length) * 100);
  $('#app').innerHTML = `
  <div class="page-head"><span class="label"><span class="dot"></span>Grammar syllabus · ${LESSONS.length} lessons</span><h1>Learn the <span class="hl">rules</span></h1></div>
  <div class="card ink">
    <div class="row between" style="align-items:flex-end"><div><span class="label">Lessons passed</span><div class="big mt" style="color:var(--sky)">${done.size}<span class="mid muted"> / ${LESSONS.length}</span></div></div>
    ${D.nextLesson ? `<button class="btn on-ink" data-lesson="${D.nextLesson.id}">Continue</button>` : ''}</div>
    <div class="bar mt"><i style="width:${Math.max(2, pct)}%"></i></div>
    <p class="xs muted" style="margin:10px 0 0">Each lesson takes 8–15 minutes. Read it, listen to the examples, then pass the quick check (80%+). Explanations are in English; tap "Ringkasan" for a short summary in Indonesian.</p>
  </div>
  ${recommended.length ? `<div class="card"><span class="label"><span class="num">!</span>Recommended for your error patterns</span><div class="list mt">${recommended.map((id) => `<div class="li row between"><span>${esc(LESSON[id].title)}</span><button class="btn sm" data-lesson="${id}">Open</button></div>`).join('')}</div></div>` : ''}
  ${UNITS.map((u, ui) => {
    const ls = LESSONS.filter((l) => l.unit === u.id);
    const d = ls.filter((l) => done.has(l.id)).length;
    return `<div class="card"><div class="card-head"><span class="label"><span class="num">${String(ui + 1).padStart(2, '0')}</span>${esc(u.name)}</span><span class="xs dim">${d} / ${ls.length}</span></div>
      <div class="list">${ls.map((l) => `<div class="li click row" data-lesson="${l.id}" style="cursor:pointer"><span class="check ${done.has(l.id) ? 'on' : ''}"></span><div style="flex:1;min-width:0"><div>${esc(l.title)}</div><div class="xs muted">${l.mins} min${l.notes2018 ? ' · includes a fix to your 2018 notes' : ''}</div></div><span class="dim">›</span></div>`).join('')}</div></div>`;
  }).join('')}`;
  bindLesson();
}

function openLesson(id) {
  const l = LESSON[id]; if (!l) return;
  if (RUN && !RUN.done && !confirm('Leave this task? Your answer here won\'t be saved.')) return;
  const t0 = Date.now();
  const unitName = UNITS.find((u) => u.id === l.unit)?.name || '';
  const idx = LESSONS.indexOf(l);
  RUN = {
    done: true,
    render() {
      $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === 'learn'));
      $('#app').innerHTML = `
      <div class="page-head"><span class="label"><span class="dot"></span>Lesson ${idx + 1} of ${LESSONS.length} · ${esc(unitName)}</span><h1 style="font-size:1.7rem">${esc(l.title)}</h1></div>
      <div class="card wash"><span class="label">Why it matters</span><p style="margin:8px 0 0">${esc(l.why)}</p></div>
      ${l.notes2018 ? `<div class="card" style="border-color:var(--sky);border-width:1px"><span class="label"><span class="num">!</span>Your 2018 notes said…</span><p class="small" style="margin:8px 0 0">${esc(l.notes2018)}</p></div>` : ''}
      ${l.rules.map((r, k) => `<div class="card"><div class="card-head"><span class="label"><span class="num">${String(k + 1).padStart(2, '0')}</span>Rule</span></div>
        <h3 style="font-size:1.1rem;font-weight:500">${esc(r.h)}</h3><p style="margin:6px 0 10px">${esc(r.body)}</p>
        ${r.good.length ? `<div class="list">${r.good.map((g) => `<div class="li row between"><span><span class="right">✓</span> ${esc(g)}</span><button class="btn sm ghost" data-say="${esc(g.replace(/\s*\(.*\)$/, ''))}" style="padding:2px 10px">Play</button></div>`).join('')}</div>` : ''}
        ${r.bad.length ? `<div class="list mt">${r.bad.map((b) => `<div class="li"><span class="down">✗</span> <span class="wrong">${esc(b)}</span></div>`).join('')}</div>` : ''}
      </div>`).join('')}
      <div class="card ink"><span class="label">Watch out</span><p style="margin:8px 0 0">${esc(l.trap)}</p></div>
      <details class="card"><summary class="label" style="cursor:pointer">Ringkasan dalam bahasa Indonesia</summary><p class="small" style="margin:10px 0 0">${esc(l.id_sum)}</p></details>
      <button class="btn full" id="ls-check">Take the quick check · ${l.check.length} questions</button>
      <div class="row mt"><button class="btn ghost" style="flex:1" id="ls-back">Back to syllabus</button></div>`;
      $$('[data-say]').forEach((b) => (b.onclick = () => speak(b.dataset.say)));
      $('#ls-back').onclick = () => { RUN = null; go('learn'); };
      $('#ls-check').onclick = () => lessonCheck(l, t0);
      window.scrollTo(0, 0);
    },
  };
  render();
}

function lessonCheck(l, t0) {
  const qs = shuffle(l.check).map((q) => { const order = shuffle(q.o.map((t, k) => ({ t, k }))); return { ...q, opts: order, ans: order.findIndex((x) => x.k === q.a) }; });
  let i = 0, right = 0, answered = false;
  RUN = {
    done: false,
    render() {
      if (i >= qs.length) return finish();
      const q = qs[i];
      $('#app').innerHTML = `<div class="card"><div class="card-head"><span class="label"><span class="dot"></span>Quick check · ${esc(l.title)}</span><span class="xs dim">${i + 1} of ${qs.length}</span></div>
        <div class="steps">${qs.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="question">${esc(q.q)}</div>
        <div class="opts">${q.opts.map((o, k) => `<button class="opt" data-o="${k}">${esc(o.t)}</button>`).join('')}</div>
        <div id="lc-why" class="mt"></div>
        <button class="btn full mt" id="lc-next" disabled>${i < qs.length - 1 ? 'Next' : 'See result'}</button></div>`;
      answered = false;
      $$('[data-o]').forEach((b) => (b.onclick = () => {
        if (answered) return; answered = true;
        const k = +b.dataset.o; const ok = k === q.ans; if (ok) right++;
        b.classList.add(ok ? 'correct' : 'incorrect'); $$('[data-o]')[q.ans].classList.add('correct');
        $('#lc-why').innerHTML = `<div class="small ${ok ? 'up' : 'down'}">${ok ? 'Correct.' : 'Not quite.'}</div><div class="small muted">${esc(q.why)}</div>`;
        $('#lc-next').disabled = false;
      }));
      $('#lc-next').onclick = () => { i++; RUN.render(); };
    },
  };
  async function finish() {
    const score = Math.round((right / qs.length) * 100);
    const passed = score >= 80;
    const mins = Math.max(1, Math.min(60, Math.round(((Date.now() - t0) / 60000) * 10) / 10));
    try {
      await api('/api/event', { body: { date: today(), type: passed ? 'lesson' : 'study', activity: 'grammar', minutes: mins, ref: passed ? l.id : undefined } });
      await refresh();
    } catch (e) { toast(esc(e.message), 'err'); }
    const D = derive();
    const next = LESSONS[LESSONS.indexOf(l) + 1];
    const drillKey = l.tags.find((t) => DRILLS[t]);
    RUN = {
      done: true,
      render() {
        $('#app').innerHTML = `<div class="card"><span class="label"><span class="dot"></span>${esc(l.title)}</span>
          <div class="row between mt" style="align-items:flex-end"><div><span class="xs muted">Score</span><div class="band">${score}%</div></div><span class="pill">${passed ? 'Lesson passed' : 'Not passed yet'}</span></div>
          <p>${passed ? 'Well done. Use this rule in your next speaking or writing task — that is where it becomes a habit.' : 'You need 80% to pass. Read the rules once more, then try again.'}</p>
          <div class="row wrap mt">
            ${passed ? (next ? `<button class="btn" data-lesson="${next.id}">Next lesson</button>` : '') : `<button class="btn" data-lesson="${l.id}">Read again</button>`}
            ${drillKey ? `<button class="btn ghost" id="lr-drill">Extra drill</button>` : ''}
            <button class="btn ghost" id="lr-back">Syllabus</button>
          </div>
          <p class="xs dim mt">${D.doneLessons.size} of ${LESSONS.length} lessons passed.</p></div>`;
        bindLesson();
        $('#lr-back').onclick = () => { RUN = null; go('learn'); };
        if ($('#lr-drill')) $('#lr-drill').onclick = () => startDrill([drillKey]);
      },
    };
    render();
  }
  render();
}

// ================= SETTINGS =================
function vSettings() {
  const sr = Recorder.supported(), tts = 'speechSynthesis' in window;
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  $('#app').innerHTML = `<div class="page-head"><span class="label"><span class="dot"></span>Settings</span><h1>Device <span class="hl">check</span></h1></div>
  <div class="card"><div class="list">
    <div class="li row between"><span>Text-to-speech</span><span class="${tts ? 'up' : 'down'}">${tts ? 'Available' : 'Not available'}</span></div>
    <div class="li row between"><span>Speech recognition</span><span class="${sr ? 'up' : 'down'}">${sr ? 'Available' : 'Not available'}</span></div></div>
    ${standalone && /iPhone|iPad/.test(navigator.userAgent) ? '<p class="small muted">Opened from the Home Screen. If the microphone test fails, use a normal Safari tab instead.</p>' : ''}
    <button class="btn full mt" id="c-tts">Test voice output</button>
    <button class="btn ghost full mt" id="c-sr">Test microphone — say "I'm practising English"</button>
    <div class="improved mt" id="c-out" style="min-height:48px"><span class="muted small">Recognised text appears here.</span></div>
    <p class="xs muted">iPhone: use Safari, allow the microphone, and keep Siri on (Settings › Siri). Samsung Tab: use Chrome or Samsung Internet. If recognition fails, every speaking task still works with keyboard dictation.</p></div>
  <div class="card"><span class="label">AI feedback</span><p style="margin:8px 0 0">${S.mana.max - S.mana.used} of ${S.mana.max} left today. Resets at 07:00 WIB. Device-scored tasks, drills and reviews don't use it.</p></div>
  <div class="card"><span class="label">Account</span><p class="small muted">${esc(S.name)} · progress is stored in your Cloudflare database and syncs across devices.</p>
    <button class="btn danger full" id="c-signout">Sign out on this device</button></div>`;
  $('#c-tts').onclick = () => speak('Your device is ready. Let\'s practise.');
  let rec = null;
  $('#c-sr').onclick = () => {
    if (rec?.active) { rec.stop(); $('#c-sr').textContent = 'Test microphone — say "I\'m practising English"'; $('#c-sr').className = 'btn ghost full mt'; return; }
    rec = new Recorder((t) => { $('#c-out').textContent = t || '…'; });
    if (rec.start('')) { $('#c-sr').textContent = 'Stop'; $('#c-sr').className = 'btn rec full mt'; }
  };
  $('#c-signout').onclick = async () => { try { await api('/api/auth/logout', { body: {} }); } catch { /* ignore */ } TOKEN = null; store.del('eh_token'); boot(); };
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && TOKEN && S && !RUN) { try { await refresh(); render(); } catch { /* ignore */ } }
});

boot();
