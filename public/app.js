// English Hunter System — client app (vanilla JS, no build step)
import {
  CATEGORIES, DRILLS, GATES, makeTask, CHAPTERS, BLOCK_INFO, LISTENING_SOURCES,
  SIDE_QUESTS, RAIDS, TARGETS, END_DATE,
} from './content.js';

// ================= utilities =================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const mmss = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const words = (t) => (String(t).trim().match(/\S+/g) || []).length;
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();
const cefrOf = (s) => (s >= 71 ? 'C2' : s >= 61 ? 'C1' : s >= 51 ? 'B2' : s >= 41 ? 'B1' : s >= 31 ? 'A2' : s >= 21 ? 'A1' : 'A0');
const store = {
  get: (k, d = null) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

function toast(msg, kind = '', title = 'SYSTEM') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = `<b>[ ${esc(title)} ]</b>${msg}`;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'err' ? 6000 : 4200);
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
  if (res.status === 401 && !path.startsWith('/api/auth/')) { TOKEN = null; store.del('eh_token'); boot(); throw new Error('Session expired'); }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ================= game math =================
// Cumulative XP needed to reach level L = 50 * L * (L - 1). ~90 min/day reaches S-rank around end of March.
const xpFor = (L) => 50 * L * (L - 1);
const levelOf = (xp) => Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2));
const RANKS = [['E', 1], ['D', 10], ['C', 20], ['B', 30], ['A', 45], ['S', 60]];
const rankOf = (lvl) => RANKS.filter(([, l]) => lvl >= l).pop()[0];
const RANK_ORDER = 'EDCBAS';
const rankColor = (r) => `var(--rank-${r})`;
const chapterOf = (d) => CHAPTERS.find((c) => d >= c.start && d <= c.end) || (d < CHAPTERS[0].start ? CHAPTERS[0] : CHAPTERS[CHAPTERS.length - 1]);

let S = null; // server state
let VIEW = store.get('eh_view', 'status');
let SUB = {}; // sub-tab per view

function derive() {
  const t = today();
  const dayMap = Object.fromEntries(S.days.map((d) => [d.date, d]));
  const totalXp = S.days.reduce((a, d) => a + (d.xp || 0), 0);
  const level = levelOf(totalXp);
  const rank = rankOf(level);
  const todayMin = S.today.reduce((a, r) => a + (r.minutes || 0), 0);
  const actMin = Object.fromEntries(S.today.map((r) => [r.activity, r.minutes]));
  // streak: consecutive days with >= 20 min, today counts if already >= 20
  let streak = 0; let d = (dayMap[t]?.minutes || 0) >= 20 ? t : addDays(t, -1);
  while ((dayMap[d]?.minutes || 0) >= 20) { streak++; d = addDays(d, -1); }
  let best = 0, run = 0, prev = null;
  for (const day of S.days) {
    if ((day.minutes || 0) >= 20) { run = prev && daysBetween(prev, day.date) === 1 ? run + 1 : 1; prev = day.date; best = Math.max(best, run); }
  }
  const fullDays = S.days.filter((x) => (x.minutes || 0) >= 90).length;
  const totalMin = S.days.reduce((a, x) => a + (x.minutes || 0), 0);
  const base = S.tests[0] || null;
  const latest = S.tests[S.tests.length - 1] || null;
  // debuffs
  const cut = addDays(t, -13);
  const cats = {};
  for (const e of S.errors) {
    const c = (cats[e.category] ||= { key: e.category, recent: 0, total: 0, first: e.date, examples: [] });
    c.total++; if (e.date >= cut) c.recent++;
    if (e.date < c.first) c.first = e.date;
    if (c.examples.length < 3) c.examples.push(e);
  }
  const debuffs = Object.values(cats).filter((c) => c.recent > 0).sort((a, b) => b.recent - a.recent);
  const cleared = Object.values(cats).filter((c) => c.recent === 0);
  const due = S.phrases.filter((p) => p.due <= t);
  const bestBand = Math.max(0, ...S.attempts.map((a) => a.band || 0));
  return { t, totalXp, level, rank, todayMin, actMin, streak, best, fullDays, totalMin, base, latest, debuffs, cleared, due, bestBand, chapter: chapterOf(t) };
}

function achievements(D) {
  const n = S.attempts.length;
  const ov = D.latest ? (D.latest.reading + D.latest.listening + D.latest.writing + D.latest.speaking) / 4 : 0;
  return [
    ['⛩', 'Awakened', 'Enter the System', true],
    ['🗝', 'First Gate', 'Clear your first gate', n >= 1],
    ['⚔', 'Gate Breaker', 'Clear 10 gates', n >= 10],
    ['🏯', 'Dungeon Veteran', 'Clear 50 gates', n >= 50],
    ['🔥', 'Spark', '3-day streak', D.best >= 3],
    ['🔥', 'Iron Discipline', '7-day streak', D.best >= 7],
    ['☄', 'Unbroken', '30-day streak', D.best >= 30],
    ['✦', 'Quest Complete', 'Finish a full 90-min Daily Quest', D.fullDays >= 1],
    ['✦', 'Relentless', '10 full Daily Quests', D.fullDays >= 10],
    ['🧪', 'Purifier', 'Clear a debuff (2 weeks clean)', D.cleared.length >= 1],
    ['📜', 'Collector', 'Save 50 phrases', S.phrases.length >= 50],
    ['🎯', 'Band 6', 'Score band 6.0 on a gate', D.bestBand >= 6],
    ['🎯', 'Band 6.5', 'Score band 6.5 on a gate', D.bestBand >= 6.5],
    ['👑', 'Band 7', 'Score band 7.0 on a gate', D.bestBand >= 7],
    ['🛡', 'Raid Survivor', 'Record your first retest', S.tests.length >= 2],
    ['🗣', 'Voice of B2', 'Speaking 51+ on a real test', (D.latest?.speaking || 0) >= 51],
    ['✒', 'Pen of B2', 'Writing 51+ on a real test', (D.latest?.writing || 0) >= 51],
    ['💠', 'C1 Hunter', 'Overall 61+ on a real test', ov >= 61],
    ...['D', 'C', 'B', 'A', 'S'].map((r) => ['◆', `${r}-Rank Hunter`, `Reach ${r}-rank`, RANK_ORDER.indexOf(D.rank) >= RANK_ORDER.indexOf(r)]),
  ].map(([ic, name, desc, got]) => ({ ic, name, desc, got }));
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
    if (!('speechSynthesis' in window)) { toast('Text-to-speech is not available on this browser.', 'err'); return resolve(); }
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
    if (!SR) { toast('Voice input is not supported here. Tap the text box and use your keyboard\'s microphone (dictation) instead.', 'err'); return false; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    this.prefix = prefix ? prefix.trimEnd() + ' ' : '';
    this.base = ''; this.final = ''; this.interim = ''; this.active = true; this.t0 = Date.now();
    setTimeout(() => this._spawn(), 250); // small gap avoids the iOS mic lock after audio playback
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
        toast('Microphone permission denied. On iPhone: Settings › Safari › Microphone = Allow, and make sure Siri is on. You can also use keyboard dictation.', 'err');
      }
    };
    r.onend = () => {
      this.base += this.final + (this.interim ? this.interim.trim() + ' ' : '');
      this.final = ''; this.interim = '';
      if (this.active) setTimeout(() => this._spawn(), 200); // Safari stops after silence: keep listening
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
    try { configured = (await api('/api/auth/status')).configured; } catch (e) { $('#app').innerHTML = `<div class="win auth"><h2>Connection failed</h2><p class="muted">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Retry</button></div>`; return; }
    return renderAuth(configured);
  }
  try { await refresh(); } catch (e) { if (TOKEN) $('#app').innerHTML = `<div class="win auth"><h2>System error</h2><p class="muted">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Retry</button></div>`; return; }
  $('#topbar').hidden = false; $('#nav').hidden = false;
  render();
  const greetKey = 'eh_greet_' + today();
  if (!store.get(greetKey)) { store.set(greetKey, 1); setTimeout(() => toast('A new <b style="display:inline;color:var(--gold)">Daily Quest</b> has arrived. Failure to complete it will reset your streak.', '', 'NOTIFICATION'), 400); }
}

function renderAuth(configured) {
  $('#app').innerHTML = `
  <div class="auth">
    <div class="win">
      <h1>HUNTER SYSTEM</h1>
      <p class="center muted small">${configured ? 'Identify yourself, Hunter.' : 'You have been chosen as a Player. Create your access key.'}</p>
      ${configured ? '' : '<label>Hunter name</label><input id="a-name" maxlength="24" value="Arief" autocomplete="nickname" />'}
      <label>Passphrase</label><input id="a-pass" type="password" autocomplete="${configured ? 'current-password' : 'new-password'}" placeholder="at least 8 characters" />
      ${configured ? '' : '<label>Confirm passphrase</label><input id="a-pass2" type="password" autocomplete="new-password" />'}
      <button id="a-go" class="btn full mt">${configured ? 'Enter' : 'Accept the System'}</button>
      ${configured ? '' : '<p class="small muted mt">Set this up right after your first deploy: the first person to open the app creates the passphrase.</p>'}
    </div>
  </div>`;
  const go = async () => {
    const pass = $('#a-pass').value;
    try {
      if (!configured) {
        if (pass !== $('#a-pass2').value) return toast('Passphrases do not match.', 'err');
        const r = await api('/api/auth/setup', { body: { passphrase: pass, name: $('#a-name').value } });
        TOKEN = r.token;
      } else {
        const r = await api('/api/auth/login', { body: { passphrase: pass } });
        TOKEN = r.token;
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
  if (PREV) {
    if (D.level > PREV.level) toast(`LEVEL UP! You reached <b style="display:inline;color:var(--gold)">Lv. ${D.level}</b>.`, 'gold', 'LEVEL UP');
    if (D.rank !== PREV.rank) toast(`Your Hunter Rank has been re-evaluated: <b style="display:inline;color:var(--gold)">${D.rank}-Rank</b>. New gates are recommended.`, 'gold', 'RANK UP');
    const newAch = achievements(D).filter((a) => a.got).map((a) => a.name).filter((n) => !PREV.ach.includes(n));
    newAch.forEach((n) => toast(`Title acquired: <b style="display:inline;color:var(--gold)">${esc(n)}</b>`, 'gold', 'ACHIEVEMENT'));
    if (PREV.todayMin < 90 && D.todayMin >= 90) toast('Daily Quest complete. Reward: +200 XP.', 'gold', 'QUEST CLEAR');
    else if (PREV.todayMin < 20 && D.todayMin >= 20) toast('Minimum reached. Your streak is safe today. +50 XP.', '', 'STREAK');
  }
  PREV = { level: D.level, rank: D.rank, todayMin: D.todayMin, ach: achievements(D).filter((a) => a.got).map((a) => a.name) };
  $('#mana-chip').textContent = `◇ ${S.mana.max - S.mana.used}/${S.mana.max}`;
}

// ================= navigation =================
const leaveOk = () => !RUN || RUN.done || confirm('Leave this gate? Your progress in it will be lost.');
$$('#nav button').forEach((b) => (b.onclick = () => { if (!leaveOk()) return; RUN = null; if ('speechSynthesis' in window) speechSynthesis.cancel(); go(b.dataset.view); }));
$('#btn-system').onclick = () => { if (!leaveOk()) return; RUN = null; go('system'); };
function go(view) { VIEW = view; store.set('eh_view', view === 'system' ? 'status' : view); render(); window.scrollTo(0, 0); }
function render() {
  if (!S) return;
  $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === VIEW));
  const D = derive();
  const views = { status: vStatus, quest: vQuest, gates: vGates, codex: vCodex, raid: vRaid, system: vSystem };
  if (RUN) return RUN.render();
  (views[VIEW] || vStatus)(D);
}

// ================= STATUS =================
function vStatus(D) {
  const L = D.level, cur = xpFor(L), next = xpFor(L + 1);
  const pct = Math.min(100, ((D.totalXp - cur) / (next - cur)) * 100);
  const titles = achievements(D).filter((a) => a.got);
  const title = titles[titles.length - 1]?.name || 'Awakened';
  const daysLeft = Math.max(0, daysBetween(D.t, END_DATE));
  const nextRaid = RAIDS.find((r) => r.date >= D.t);
  const stats = ['reading', 'listening', 'writing', 'speaking'];
  const qpct = Math.min(100, (D.todayMin / 90) * 100);
  $('#app').innerHTML = `
  <div class="sys-msg"><b>[ SYSTEM ]</b> Chapter ${D.chapter.n}: <b style="color:var(--text)">${esc(D.chapter.name)}</b> — ${esc(D.chapter.focus)}</div>
  <div class="win">
    <div class="win-title"><h2>Status</h2><span class="tag">${daysLeft} DAYS TO FINAL RAID</span></div>
    <div class="hunter">
      <div class="rank-badge" style="color:${rankColor(D.rank)}"><span>${D.rank}</span></div>
      <div class="hunter-info">
        <div class="hunter-name">${esc(S.name)}</div>
        <div class="title-line">TITLE: ${esc(title)}</div>
        <div class="row between small mt"><span>LV. <b style="color:var(--cyan);font-size:1.1rem">${L}</b></span><span class="muted">${(D.totalXp - cur).toLocaleString()} / ${(next - cur).toLocaleString()} XP</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </div>
    </div>
    <div class="kpis mt">
      <div class="kpi"><div class="v">${D.streak}🔥</div><div class="l">Streak</div></div>
      <div class="kpi"><div class="v">${Math.round(D.todayMin)}<span class="small">/90</span></div><div class="l">Today (min)</div></div>
      <div class="kpi"><div class="v">${Math.round(D.totalMin / 60)}<span class="small">h</span></div><div class="l">Total trained</div></div>
    </div>
  </div>

  <div class="win">
    <div class="win-title"><h2>Daily Quest</h2><span class="tag">${D.todayMin >= 90 ? 'COMPLETE' : D.todayMin >= 20 ? 'STREAK SAFE' : 'IN PROGRESS'}</span></div>
    <div class="bar ${D.todayMin >= 90 ? 'gold' : ''}"><i style="width:${qpct}%"></i><span class="mark" style="left:${(20 / 90) * 100}%"></span></div>
    <div class="row between small mt"><span class="muted">Minimum 20 min keeps the streak · 90 min clears the quest</span></div>
    <button class="btn full mt" data-go="quest">Open Daily Quest</button>
  </div>

  <div class="win">
    <div class="win-title"><h2>Abilities</h2><span class="tag">FROM REAL TESTS ONLY · ${D.latest ? esc(D.latest.source) + ' ' + fmtDate(D.latest.date) : 'NO DATA'}</span></div>
    ${D.latest ? stats.map((k) => {
      const v = D.latest[k], b = D.base?.[k] ?? v, dlt = v - b;
      return `<div class="stat"><div class="stat-top"><span>${k.toUpperCase()} <span class="cefr">${cefrOf(v)}</span></span><span><b>${v}</b>${dlt ? ` <span class="${dlt > 0 ? 'delta-up' : 'delta-down'} small">${dlt > 0 ? '+' : ''}${dlt}</span>` : ''} <span class="muted small">→ ${TARGETS[k]}</span></span></div>
      <div class="bar"><i style="width:${v}%"></i><span class="mark" style="left:${TARGETS[k]}%"></span></div></div>`;
    }).join('') : '<p class="muted">Record a test in the Raid tab.</p>'}
    <p class="small muted">Gold mark = March target. XP measures effort; these numbers only change after a real test (Raid).</p>
  </div>

  <div class="win">
    <div class="win-title"><h2>Active Debuffs</h2><span class="tag">LAST 14 DAYS</span></div>
    ${D.debuffs.length ? D.debuffs.slice(0, 5).map((c) => `<div class="item debuff row between"><div><b>${esc(CATEGORIES[c.key]?.name || c.key)}</b><div class="small muted">${esc(CATEGORIES[c.key]?.hint || '')}</div></div><span class="count">×${c.recent}</span></div>`).join('') : '<p class="muted">No active debuffs. Clean run.</p>'}
    <button class="btn ghost full" data-go="codex">Purge in Codex</button>
  </div>

  ${nextRaid ? `<div class="win"><div class="win-title"><h2>Next Raid</h2><span class="tag">${esc(nextRaid.name)}</span></div>
    <div class="row between"><div><div class="head" style="font-size:1.3rem">${fmtDate(nextRaid.date)}</div><div class="small muted">EF SET full test (4 skills)</div></div><div class="timer">${daysBetween(D.t, nextRaid.date)}d</div></div></div>` : ''}
  `;
  bindGo();
}
function bindGo() { $$('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go))); }

// ================= QUEST =================
let TIMER = store.get('eh_timer'); // {activity, start}
function vQuest(D) {
  const ch = D.chapter;
  const blocks = Object.entries(ch.blocks);
  $('#app').innerHTML = `
  <div class="sys-msg"><b>[ DAILY QUEST ]</b> Train for <b style="color:var(--text)">90 minutes</b> today — any time, any split. Minimum 20 minutes protects your streak.</div>
  <div class="win">
    <div class="win-title"><h2>Today · ${fmtDate(D.t)}</h2><span class="tag">${Math.round(D.todayMin)} / 90 MIN</span></div>
    ${blocks.map(([k, target]) => {
      const done = D.actMin[k] || 0; const ok = done >= target;
      return `<div class="item ${ok ? 'done' : ''}"><div class="quest-block">
        <div><b>${ok ? '<span class="check">✓</span> ' : ''}${esc(BLOCK_INFO[k].label)}</b><div class="small muted">${esc(BLOCK_INFO[k].note)}</div></div>
        <span class="head" style="color:${ok ? 'var(--green)' : 'var(--cyan)'}">${Math.round(done)}/${target}</span>
        <div class="bar"><i style="width:${Math.min(100, (done / target) * 100)}%"></i></div>
        </div>
        <div class="row mt">${BLOCK_INFO[k].where === 'timer' ? `<button class="btn sm" data-timer="${k}">Start timer</button>` : `<button class="btn sm" data-go="${BLOCK_INFO[k].where}">Go</button><button class="btn sm ghost" data-timer="${k}">Timer</button>`}</div>
      </div>`;
    }).join('')}
    <p class="small muted">Gates, drills and reviews log their time automatically. Use the timer for anything outside the app (listening, Side Quests, reading).</p>
  </div>

  <div class="win timer-card" id="timer-card"></div>

  <div class="win">
    <div class="win-title"><h2>Listening sources</h2><span class="tag">SHADOWING</span></div>
    ${LISTENING_SOURCES.map((s) => `<div class="item"><a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)} ↗</a></div>`).join('')}
    <p class="small muted">Method: listen once for meaning → replay sentence by sentence → pause and repeat out loud, copying rhythm and stress.</p>
  </div>

  <div class="win">
    <div class="win-title"><h2>Log time manually</h2></div>
    <div class="grid2">
      <div><label>Activity</label><select id="m-act">${Object.keys(BLOCK_INFO).map((k) => `<option value="${k}">${esc(BLOCK_INFO[k].label)}</option>`).join('')}<option value="other">Other English practice</option></select></div>
      <div><label>Minutes</label><input id="m-min" type="number" min="1" max="180" inputmode="numeric" placeholder="e.g. 20" /></div>
    </div>
    <button class="btn full mt" id="m-log">Log time</button>
  </div>`;
  bindGo();
  $$('[data-timer]').forEach((b) => (b.onclick = () => startTimer(b.dataset.timer)));
  $('#m-log').onclick = async () => {
    const m = Number($('#m-min').value);
    if (!(m > 0)) return toast('Enter minutes.', 'err');
    await logTime($('#m-act').value, m);
  };
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
  if (!TIMER) { el.innerHTML = '<div class="win-title"><h2>Training timer</h2><span class="tag">IDLE</span></div><p class="muted small">Start a timer from any quest block above.</p>'; return; }
  const label = BLOCK_INFO[TIMER.activity]?.label || 'Practice';
  el.innerHTML = `<div class="win-title"><h2>Training timer</h2><span class="tag">${esc(label.toUpperCase())}</span></div>
    <div class="timer" id="t-val">0:00</div>
    <div class="row mt" style="justify-content:center"><button class="btn" id="t-stop">Stop & log</button><button class="btn ghost" id="t-cancel">Discard</button></div>`;
  const upd = () => { const v = $('#t-val'); if (v) v.textContent = mmss((Date.now() - TIMER.start) / 1000); };
  upd(); timerTick = setInterval(upd, 1000);
  $('#t-stop').onclick = async () => {
    const mins = Math.min(180, (Date.now() - TIMER.start) / 60000);
    const act = TIMER.activity; TIMER = null; store.del('eh_timer'); clearInterval(timerTick);
    if (mins < 1) { toast('Less than a minute — not logged.'); return render(); }
    await logTime(act, Math.round(mins * 10) / 10);
  };
  $('#t-cancel').onclick = () => { if (!confirm('Discard this timer?')) return; TIMER = null; store.del('eh_timer'); drawTimer(); };
}
async function logTime(activity, minutes, type = 'study', count = 0) {
  try {
    const r = await api('/api/event', { body: { date: today(), type, activity, minutes, count } });
    toast(`+${Math.round(r.xp)} XP · ${minutes} min ${esc(BLOCK_INFO[activity]?.label || activity)}`);
    await refresh(); render();
  } catch (e) { toast(esc(e.message), 'err'); }
}

// ================= GATES =================
let RUN = null; // active runner {render()}
function vGates(D) {
  const myIdx = RANK_ORDER.indexOf(D.rank);
  const stats = Object.fromEntries(S.gateStats.map((g) => [g.gate_id, g]));
  const filt = SUB.gates || 'all';
  const list = GATES.filter((g) => filt === 'all' || g.skill === filt);
  $('#app').innerHTML = `
  <div class="sys-msg"><b>[ GATES ]</b> Your rank: <b style="color:${rankColor(D.rank)}">${D.rank}</b>. Gates up to one rank above you are recommended. Higher gates are open — enter at your own risk.</div>
  <div class="tabs">${['all', 'speaking', 'writing'].map((k) => `<button data-f="${k}" class="${filt === k ? 'on' : ''}">${k}</button>`).join('')}</div>
  ${RANK_ORDER.split('').map((r) => {
    const gs = list.filter((g) => g.rank === r); if (!gs.length) return '';
    const danger = RANK_ORDER.indexOf(r) > myIdx + 1;
    return `<div class="win"><div class="win-title"><h2 style="color:${rankColor(r)}">${r}-Rank Gates</h2><span class="tag">${danger ? '⚠ ABOVE YOUR RANK' : 'RECOMMENDED'}</span></div>
      ${gs.map((g) => { const st = stats[g.id]; return `<div class="item clickable ${danger ? 'locked' : ''}" data-gate="${g.id}">
        <div class="gate-head"><span class="rank-pill" style="color:${rankColor(r)}">${r}</span><div style="flex:1"><b>${esc(g.title)}</b> <span class="chip">${esc(g.exam)}</span> <span class="chip">${g.skill === 'speaking' ? '🎙 speaking' : '✒ writing'}</span>
        <div class="small muted">${esc(g.desc)}</div>
        <div class="gate-meta">~${g.mins} min · ${g.mode === 'ai' ? '◇ 1 mana' : 'no mana'}${st ? ` · cleared ×${st.clears}${st.best_band ? ` · best band ${st.best_band}` : ''}${st.best_score != null ? ` · best ${Math.round(st.best_score)}%` : ''}` : ''}</div></div></div></div>`; }).join('')}
    </div>`;
  }).join('')}`;
  $$('[data-f]').forEach((b) => (b.onclick = () => { SUB.gates = b.dataset.f; render(); }));
  $$('[data-gate]').forEach((el) => (el.onclick = () => enterGate(GATES.find((g) => g.id === el.dataset.gate))));
}

function enterGate(gate) {
  if (gate.mode === 'ai' && S.mana.used >= S.mana.max) return toast('Mana depleted for today. AI gates reopen at 07:00 WIB. Offline gates and drills still work.', 'err');
  const task = makeTask(gate);
  if (gate.mode === 'repeat') RUN = repeatRunner(gate, task);
  else if (gate.mode === 'build') RUN = buildRunner(gate, task);
  else if (gate.skill === 'speaking') RUN = speakingRunner(gate, task);
  else RUN = writingRunner(gate, task);
  render(); window.scrollTo(0, 0);
}
function exitRun() { RUN = null; render(); }
const gateHeader = (gate, extra = '') => `<div class="win-title"><h2 style="color:${rankColor(gate.rank)}">${gate.rank}-Gate · ${esc(gate.title)}</h2><span class="tag">${esc(gate.exam)}${extra}</span></div>`;

// ---- Speaking (AI) ----
function speakingRunner(gate, task) {
  const qs = task.questions;
  const limits = task.limits || qs.map(() => gate.perQ || 60);
  const answers = qs.map(() => ''); const secs = qs.map(() => 0);
  const needsPrep = (k) => (gate.prep && k === 0) || task.prepAt === k;
  let i = 0, phase = needsPrep(0) ? 'prep' : 'ready', rec = null, tick = null, t0 = 0, prepLeft = 0;
  const self = {
    render() {
      clearInterval(tick);
      const q = qs[i];
      $('#app').innerHTML = `<div class="win">${gateHeader(gate, ` · Q${i + 1}/${qs.length}`)}
        ${task.header ? `<div class="small muted mb">${esc(task.header)}</div>` : ''}
        <div class="progress-dots">${qs.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="question">${esc(q)}</div>
        <div class="row mb"><button class="btn sm ghost" id="s-hear">🔊 Hear question</button><span class="small muted">Answer limit: ${mmss(limits[i])}</span></div>
        ${phase === 'prep' ? `<div class="sys-msg"><b>PREPARATION</b> Make short notes (keywords only). Speaking starts when the timer ends.</div><div class="timer" id="s-timer">${mmss(60)}</div><textarea id="s-notes" placeholder="Notes (not submitted)" style="min-height:90px"></textarea><button class="btn full mt" id="s-skip">I'm ready — start speaking</button>`
        : `<div class="timer" id="s-timer">${mmss(limits[i])}</div>
        <button class="btn full ${phase === 'rec' ? 'rec' : ''}" id="s-rec">${phase === 'rec' ? '■ Stop' : answers[i] ? '● Record again (append)' : '● Start speaking'}</button>
        <label>Transcript (you can fix recognition mistakes, but not your grammar)</label>
        <textarea id="s-text" placeholder="${Recorder.supported() ? 'Your words appear here as you speak…' : 'Voice input unavailable: tap here and use the keyboard microphone.'}">${esc(answers[i])}</textarea>
        <div class="row between mt"><span class="small muted" id="s-wc">${words(answers[i])} words</span>
        <button class="btn" id="s-next" ${phase === 'rec' ? 'disabled' : ''}>${i < qs.length - 1 ? 'Next question →' : 'Submit to examiner'}</button></div>`}
        <button class="btn ghost full mt" id="s-quit">Abandon gate</button></div>`;
      $('#s-hear').onclick = () => { if (phase !== 'rec') speak(q.replace(/^\[.*?\]\s*/, '').replace(/You should say:[\s\S]*/, '')); };
      $('#s-quit').onclick = () => { rec?.stop(); if (confirm('Abandon this gate?')) exitRun(); };
      if (phase === 'prep') {
        prepLeft = 60; const el = $('#s-timer');
        tick = setInterval(() => { prepLeft--; el.textContent = mmss(prepLeft); if (prepLeft <= 0) { phase = 'ready'; self.render(); } }, 1000);
        $('#s-skip').onclick = () => { phase = 'ready'; self.render(); };
        return;
      }
      const ta = $('#s-text');
      ta.oninput = () => { answers[i] = ta.value; $('#s-wc').textContent = words(ta.value) + ' words'; };
      $('#s-rec').onclick = () => {
        if (phase === 'rec') { secs[i] += rec.stop(); phase = 'ready'; clearInterval(tick); setTimeout(() => self.render(), 350); return; }
        rec = new Recorder((txt) => { answers[i] = txt; const t = $('#s-text'); if (t) { t.value = txt; $('#s-wc').textContent = words(txt) + ' words'; } }, () => {});
        if (!rec.start(answers[i])) return;
        phase = 'rec'; t0 = Date.now(); self.render();
        const el = $('#s-timer'); const limit = limits[i];
        tick = setInterval(() => {
          const left = limit - (Date.now() - t0) / 1000;
          el.textContent = mmss(left); el.className = 'timer' + (left <= 10 ? ' warn' : '') + (left <= 0 ? ' over' : '');
          if (left <= 0) { secs[i] += rec.stop(); phase = 'ready'; clearInterval(tick); toast('Time is up for this question.'); setTimeout(() => self.render(), 400); }
        }, 250);
      };
      if (phase === 'rec') $('#s-rec').classList.add('rec');
      $('#s-next').onclick = async () => {
        answers[i] = $('#s-text').value;
        if (words(answers[i]) < 3 && !confirm('This answer is almost empty. Continue anyway?')) return;
        if (!secs[i]) secs[i] = Math.min(limits[i], words(answers[i]) / 2); // typed answer: rough estimate (~120 wpm)
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
      $('#app').innerHTML = `<div class="win">${gateHeader(gate)}
        <div class="question">${esc(prompt)}</div>
        <div class="row between"><span class="small muted">Target: ${gate.mins} min · ${gate.minWords}+ words${gate.strict ? ' · STRICT: locks at 0:00' : ''}</span><span class="timer" id="w-timer" style="font-size:1.4rem">${mmss(limit)}</span></div>
        <textarea id="w-text" style="min-height:300px" spellcheck="false" autocorrect="off" autocapitalize="sentences" placeholder="Write here. Spellcheck is off — just like the real exam.">${esc(text)}</textarea>
        <div class="row between mt"><span class="small" id="w-wc"></span><button class="btn" id="w-submit">Submit to examiner</button></div>
        <div class="row mt"><button class="btn ghost sm" id="w-new">New prompt</button><button class="btn ghost sm" id="w-quit">Save & leave</button></div></div>`;
      const ta = $('#w-text'); const wc = $('#w-wc');
      const upd = () => { const n = words(ta.value); wc.innerHTML = `<b style="color:${n >= gate.minWords ? 'var(--green)' : 'var(--gold)'}">${n}</b> / ${gate.minWords} words`; };
      upd();
      ta.oninput = () => { text = ta.value; store.set(key, { prompt, text, t0 }); upd(); };
      const el = $('#w-timer');
      const tickFn = () => {
        const left = limit - (Date.now() - t0) / 1000;
        el.textContent = (left < 0 ? '+' : '') + mmss(Math.abs(left));
        el.className = 'timer' + (left <= 120 ? ' warn' : '') + (left <= 0 ? ' over' : '');
        if (gate.strict && left <= 0 && !ta.readOnly) { ta.readOnly = true; toast('Time is up. Pens down — submit your essay.', 'err'); }
      };
      tickFn(); tick = setInterval(tickFn, 1000);
      $('#w-new').onclick = () => { if (ta.value.trim() && !confirm('Discard this draft and get a new prompt?')) return; store.del(key); RUN = writingRunner(gate, makeTask(gate)); render(); };
      $('#w-quit').onclick = () => { clearInterval(tick); toast('Draft saved on this device.'); exitRun(); };
      $('#w-submit').onclick = async () => {
        if (words(ta.value) < gate.minWords * 0.5 && !confirm('Your answer is much shorter than required (this lowers your band). Submit anyway?')) return;
        clearInterval(tick);
        const ok = await submitAI(gate, prompt, ta.value, Math.round(Math.min(7200, (Date.now() - t0) / 1000)), `Minimum length ${gate.minWords} words; time limit ${gate.mins} minutes.`);
        if (ok) store.del(key);
      };
    },
  };
  return self;
}

async function submitAI(gate, prompt, response, seconds, note) {
  $('#app').innerHTML = `<div class="win center"><h2>Examiner is evaluating…</h2><p class="muted">Analysing grammar, vocabulary, coherence and task response.</p><div class="sys-dot" style="margin:20px auto;width:14px;height:14px"></div></div>`;
  try {
    const r = await api('/api/gate/ai', { body: { date: today(), gate: { id: gate.id, rank: gate.rank, skill: gate.skill, exam: gate.exam, title: gate.title }, prompt, response, seconds, note } });
    await refresh();
    RUN = { done: true, render: () => feedbackView(gate, r, response) };
    render(); window.scrollTo(0, 0);
    toast(`Gate cleared. +${Math.round(r.xp)} XP`, 'gold', 'GATE CLEAR');
    return true;
  } catch (e) {
    toast(esc(e.message), 'err');
    RUN && RUN.render();
    return false;
  }
}

function feedbackView(gate, r, response) {
  const f = r.feedback;
  $('#app').innerHTML = `<div class="win">${gateHeader(gate, ' · RESULT')}
    <div class="row between"><div><div class="small muted">Estimated band</div><div class="band">${f.band ?? '–'}</div></div>
    <div style="text-align:right"><div class="chip on">${esc(f.cefr || '')}</div><div class="small muted mt">${r.words} words${r.wpm ? ` · ${r.wpm} wpm` : ''}</div><div class="head" style="color:var(--gold)">+${Math.round(r.xp)} XP</div></div></div>
    <p>${esc(f.summary)}</p>
    ${f.strengths?.length ? `<div class="fb-section"><h3>Strengths</h3>${f.strengths.map((s) => `<div class="small">✓ ${esc(s)}</div>`).join('')}</div>` : ''}
    <div class="fb-section"><h3>Corrections → added to Error Bank</h3>
      ${f.corrections?.length ? f.corrections.map((c) => `<div class="item"><div class="err-line"><span class="wrong">${esc(c.wrong)}</span> → <span class="right">${esc(c.correct)}</span></div><div class="small muted">${esc(CATEGORIES[c.category]?.name || c.category)} · ${esc(c.explanation)}</div></div>`).join('') : '<p class="muted small">No major errors found.</p>'}
    </div>
    <div class="fb-section"><h3>Upgraded answer (your ideas, one level higher)</h3><div class="upgraded">${esc(f.upgraded_answer)}</div>
      <div class="row mt wrap"><button class="btn sm" id="f-listen">🔊 Listen</button><button class="btn sm ghost" id="f-slow">🐢 Slow</button><button class="btn sm ghost" id="f-stop">■</button></div>
      <p class="small muted">Shadow it: play, pause after each sentence, repeat out loud with the same rhythm.</p></div>
    ${f.phrases?.length ? `<div class="fb-section"><h3>New phrases → Phrase Bank</h3>${f.phrases.map((p) => `<div class="small"><b>${esc(p.phrase)}</b> — <span class="muted">${esc(p.meaning)}</span></div>`).join('')}</div>` : ''}
    ${f.next_focus ? `<div class="fb-section"><h3>Next focus</h3><p class="small">${esc(f.next_focus)}</p></div>` : ''}
    <details class="mt"><summary class="small muted">Your original answer</summary><div class="pre small mt">${esc(response)}</div></details>
    <div class="row mt"><button class="btn" id="f-again">Enter again</button><button class="btn ghost" id="f-done">Back to gates</button></div></div>`;
  $('#f-listen').onclick = () => speak(f.upgraded_answer, 0.95);
  $('#f-slow').onclick = () => speak(f.upgraded_answer, 0.75);
  $('#f-stop').onclick = () => speechSynthesis.cancel();
  $('#f-again').onclick = () => { RUN = null; enterGate(gate); };
  $('#f-done').onclick = () => { speechSynthesis.cancel(); RUN = null; go('gates'); };
}

// ---- Listen & Repeat (offline) ----
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
      $('#app').innerHTML = `<div class="win">${gateHeader(gate, ` · ${i + 1}/${items.length}`)}
        <div class="progress-dots">${items.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <p class="small muted">Listen, then repeat the sentence <b>exactly</b>. The sentence is hidden — rely on your ears.</p>
        <button class="btn full" id="r-play">🔊 ${plays ? 'Play again' : 'Play sentence'} (${2 - plays} left)</button>
        <button class="btn full mt ${phase === 'rec' ? 'rec' : ''}" id="r-rec">${phase === 'rec' ? '■ Stop' : '● Repeat it'}</button>
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
        $('#r-res').innerHTML = `<div class="item mt"><div class="diff">${target.split(/\s+/).map((w, k) => `<span class="${hit[k] ? 'ok' : 'miss'}">${esc(w)}</span>`).join(' ')}</div>
          <div class="row between mt"><span class="head" style="color:${score >= 0.9 ? 'var(--green)' : score >= 0.6 ? 'var(--gold)' : 'var(--red)'}">${Math.round(score * 100)}%</span><button class="btn sm" id="r-next">Next →</button></div></div>`;
        $('#r-check').disabled = true; $('#r-rec').disabled = true;
        $('#r-next').onclick = () => { i++; plays = 0; said = ''; phase = 'listen'; self.render(); };
      };
    },
    async finish() {
      const avg = results.reduce((a, r) => a + r.score, 0) / results.length * 100;
      const secs = Math.round((Date.now() - t0) / 1000);
      try {
        const r = await api('/api/gate/local', { body: { date: today(), gate: { id: gate.id, rank: gate.rank, skill: gate.skill, exam: gate.exam, title: gate.title }, score: avg, seconds: secs, detail: results.map((x) => `${Math.round(x.score * 100)}% | ${x.target} | ${x.said}`).join('\n') } });
        await refresh();
        RUN = { done: true, render: () => localResult(gate, avg, r.xp, results.map((x) => `<div class="item small"><b>${Math.round(x.score * 100)}%</b> ${esc(x.target)}<div class="muted">You: ${esc(x.said || '—')}</div></div>`).join('')) };
        render();
      } catch (e) { toast(esc(e.message), 'err'); exitRun(); }
    },
  };
  return self;
}
function localResult(gate, score, xp, detail) {
  $('#app').innerHTML = `<div class="win">${gateHeader(gate, ' · RESULT')}
    <div class="row between"><div><div class="small muted">Accuracy</div><div class="band">${Math.round(score)}%</div></div><div class="head" style="color:var(--gold);font-size:1.3rem">+${Math.round(xp)} XP</div></div>
    <div class="mt">${detail}</div>
    <div class="row mt"><button class="btn" id="l-again">Enter again</button><button class="btn ghost" id="l-done">Back to gates</button></div></div>`;
  $('#l-again').onclick = () => { RUN = null; enterGate(gate); };
  $('#l-done').onclick = () => { RUN = null; go('gates'); };
  toast(`Gate cleared. +${Math.round(xp)} XP`, 'gold', 'GATE CLEAR');
}

// ---- Build a Sentence (offline) ----
function buildRunner(gate, task) {
  const items = task.items; let i = 0, picked = [], checked = false, correct = 0; const log = [];
  const t0 = Date.now(); let bank = [];
  const prep = () => { bank = shuffle(items[i].ans.split(' ').map((w, k) => ({ w, k }))); picked = []; checked = false; };
  prep();
  const self = {
    render() {
      if (i >= items.length) return self.finish();
      const it = items[i];
      $('#app').innerHTML = `<div class="win">${gateHeader(gate, ` · ${i + 1}/${items.length}`)}
        <div class="progress-dots">${items.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="question">A: ${esc(it.ctx)}<br>B: …</div>
        <label>Your reply (tap words in order · tap a placed word to remove it)</label>
        <div class="wordbank" id="b-ans">${picked.map((p, k) => `<span class="word" data-rm="${k}">${esc(p.w)}</span>`).join('')}</div>
        <div class="wordbank">${bank.map((b, k) => `<span class="word ${picked.includes(b) ? 'used' : ''}" data-add="${k}">${esc(b.w)}</span>`).join('')}</div>
        <div id="b-res"></div>
        <button class="btn full mt" id="b-check" ${picked.length !== bank.length ? 'disabled' : ''}>${checked ? 'Next →' : 'Check'}</button></div>`;
      if (!checked) {
        $$('[data-add]').forEach((el) => (el.onclick = () => { picked.push(bank[+el.dataset.add]); self.render(); }));
        $$('[data-rm]').forEach((el) => (el.onclick = () => { picked.splice(+el.dataset.rm, 1); self.render(); }));
      }
      $('#b-check').onclick = () => {
        if (checked) { i++; if (i < items.length) prep(); self.render(); return; }
        const ok = norm(picked.map((p) => p.w).join(' ')) === norm(it.ans);
        if (ok) correct++;
        log.push(`${ok ? '✓' : '✗'} ${it.ans}`);
        checked = true; self.render();
        $('#b-res').innerHTML = `<div class="item ${ok ? 'done' : 'debuff'}">${ok ? '<span class="right">Correct!</span>' : `<span class="wrong">Not quite.</span><div class="small mt">Answer: <span class="right">${esc(it.ans)}</span></div>`}</div>`;
      };
    },
    async finish() {
      const score = (correct / items.length) * 100;
      try {
        const r = await api('/api/gate/local', { body: { date: today(), gate: { id: gate.id, rank: gate.rank, skill: gate.skill, exam: gate.exam, title: gate.title }, score, seconds: Math.round((Date.now() - t0) / 1000), detail: log.join('\n') } });
        await refresh();
        RUN = { done: true, render: () => localResult(gate, score, r.xp, log.map((l) => `<div class="small">${esc(l)}</div>`).join('')) };
        render();
      } catch (e) { toast(esc(e.message), 'err'); exitRun(); }
    },
  };
  return self;
}

// ================= CODEX (debuffs, error bank, phrases) =================
function vCodex(D) {
  const tab = SUB.codex || 'debuffs';
  const tabs = `<div class="tabs">${[['debuffs', 'Debuffs'], ['errors', 'Error Bank'], ['phrases', `Phrases${D.due.length ? ` (${D.due.length})` : ''}`]].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'debuffs') {
    body = `<div class="sys-msg"><b>[ DEBUFFS ]</b> Errors repeated in the last 14 days. A debuff is purged when it does not appear for 14 days.</div>
    <button class="btn full mb" id="d-mixed" ${D.debuffs.length ? '' : 'disabled'}>⚡ Mixed purge drill (top debuffs)</button>
    ${D.debuffs.map((c) => `<div class="win debuff"><div class="row between"><div><h3>${esc(CATEGORIES[c.key]?.name || c.key)}</h3><div class="small muted">${esc(CATEGORIES[c.key]?.hint || '')}</div></div><span class="count">×${c.recent}</span></div>
      ${c.examples.map((e) => `<div class="err-line"><span class="wrong">${esc(e.wrong)}</span> → <span class="right">${esc(e.correct)}</span></div>`).join('')}
      ${DRILLS[c.key] ? `<button class="btn sm mt" data-drill="${c.key}">Purge drill</button>` : ''}</div>`).join('') || '<p class="muted">No active debuffs.</p>'}
    ${D.cleared.length ? `<div class="win"><div class="win-title"><h2>Purged</h2></div>${D.cleared.map((c) => `<div class="item cleared">${esc(CATEGORIES[c.key]?.name || c.key)} <span class="small muted">— clean for 14+ days</span></div>`).join('')}</div>` : ''}
    <div class="win"><div class="win-title"><h2>Training drills</h2><span class="tag">NO MANA</span></div><div class="chips">${Object.keys(DRILLS).map((k) => `<button class="chip" data-drill="${k}">${esc(CATEGORIES[k].name)}</button>`).join('')}</div></div>`;
  } else if (tab === 'errors') {
    const f = SUB.errf || 'all';
    const list = S.errors.filter((e) => f === 'all' || e.category === f).slice(0, 150);
    body = `<div class="chips mb"><button class="chip ${f === 'all' ? 'on' : ''}" data-ef="all">All (${S.errors.length})</button>${Object.keys(CATEGORIES).filter((k) => S.errors.some((e) => e.category === k)).map((k) => `<button class="chip ${f === k ? 'on' : ''}" data-ef="${k}">${esc(CATEGORIES[k].name)}</button>`).join('')}</div>
    ${list.map((e) => `<div class="item"><div class="row between"><div class="err-line"><span class="wrong">${esc(e.wrong)}</span> → <span class="right">${esc(e.correct)}</span></div><button class="btn sm ghost" data-del-err="${e.id}">✕</button></div><div class="small muted">${fmtDate(e.date)} · ${esc(CATEGORIES[e.category]?.name || e.category)}${e.explanation ? ' · ' + esc(e.explanation) : ''}</div></div>`).join('') || '<p class="muted">Empty.</p>'}`;
  } else {
    body = `<div class="win"><div class="win-title"><h2>Review</h2><span class="tag">${D.due.length} DUE</span></div>
      <p class="small muted">Spaced repetition: 1 → 3 → 7 → 14 → 30 → 60 days. Say each phrase in your own sentence out loud.</p>
      <button class="btn full" id="p-review" ${D.due.length ? '' : 'disabled'}>Start review</button></div>
    <div class="win"><div class="win-title"><h2>Add phrase</h2></div>
      <input id="p-phrase" maxlength="80" placeholder="e.g. play a key role in" /><input id="p-mean" class="mt" maxlength="160" placeholder="meaning / example" />
      <button class="btn full mt" id="p-add">Add</button></div>
    <div class="win"><div class="win-title"><h2>All phrases</h2><span class="tag">${S.phrases.length}</span></div>
      ${S.phrases.map((p) => `<div class="item"><div class="row between"><div><b>${esc(p.phrase)}</b> <button class="btn sm ghost" data-say="${esc(p.phrase)}">🔊</button><div class="small muted">${esc(p.meaning || '')}</div></div><button class="btn sm ghost" data-del-ph="${p.id}">✕</button></div><div class="small muted">Next review ${fmtDate(p.due)}</div></div>`).join('') || '<p class="muted">Phrases from gate feedback appear here automatically.</p>'}</div>`;
  }
  $('#app').innerHTML = tabs + body;
  $$('[data-t]').forEach((b) => (b.onclick = () => { SUB.codex = b.dataset.t; render(); }));
  $$('[data-ef]').forEach((b) => (b.onclick = () => { SUB.errf = b.dataset.ef; render(); }));
  $$('[data-drill]').forEach((b) => (b.onclick = () => startDrill([b.dataset.drill])));
  $('#d-mixed') && ($('#d-mixed').onclick = () => startDrill(D.debuffs.map((c) => c.key).filter((k) => DRILLS[k]).slice(0, 4)));
  $$('[data-del-err]').forEach((b) => (b.onclick = async () => { if (!confirm('Delete this error? (Only if the AI was wrong.)')) return; await api('/api/errors/' + b.dataset.delErr, { method: 'DELETE' }); await refresh(); render(); }));
  $$('[data-del-ph]').forEach((b) => (b.onclick = async () => { if (!confirm('Delete this phrase?')) return; await api('/api/phrases/' + b.dataset.delPh, { method: 'DELETE' }); await refresh(); render(); }));
  $$('[data-say]').forEach((b) => (b.onclick = () => speak(b.dataset.say)));
  if ($('#p-add')) $('#p-add').onclick = async () => {
    const phrase = $('#p-phrase').value.trim(); if (!phrase) return;
    try { await api('/api/phrases', { body: { phrase, meaning: $('#p-mean').value, date: today() } }); toast('Phrase added.'); await refresh(); render(); } catch (e) { toast(esc(e.message), 'err'); }
  };
  if ($('#p-review')) $('#p-review').onclick = () => { RUN = phraseRunner(D.due); render(); };
}

function startDrill(keys) {
  const pool = keys.flatMap((k) => DRILLS[k].map((q) => ({ ...q, cat: k })));
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
      $('#app').innerHTML = `<div class="win"><div class="win-title"><h2>Purge Drill</h2><span class="tag">${esc(CATEGORIES[q.cat].name.toUpperCase())} · ${i + 1}/${qs.length}</span></div>
        <div class="question">${esc(q.q)}</div>
        <div class="opts">${q.opts.map((o, k) => `<button class="opt" data-o="${k}">${esc(o.t)}</button>`).join('')}</div>
        <div id="dr-why" class="mt"></div>
        <div class="row mt"><button class="btn" id="dr-next" disabled>Next →</button><button class="btn ghost" id="dr-quit">Quit</button></div></div>`;
      answered = false;
      $$('[data-o]').forEach((b) => (b.onclick = () => {
        if (answered) return; answered = true;
        const k = +b.dataset.o; const ok = k === q.ans; if (ok) right++;
        b.classList.add(ok ? 'correct' : 'incorrect'); $$('[data-o]')[q.ans].classList.add('correct');
        $('#dr-why').innerHTML = `<div class="small ${ok ? 'right' : 'wrong'}" style="text-decoration:none">${ok ? 'Correct.' : 'Wrong.'}</div><div class="small muted">${esc(q.why)}</div>`;
        $('#dr-next').disabled = false;
      }));
      $('#dr-next').onclick = () => { i++; RUN.render(); };
      $('#dr-quit').onclick = () => { i = qs.length; RUN.render(); };
    },
  };
  async function finish() {
    const mins = Math.max(1, Math.round(((Date.now() - t0) / 60000) * 10) / 10);
    RUN = null;
    toast(`Drill complete: ${right}/${qs.length} correct.`);
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
      $('#app').innerHTML = `<div class="win"><div class="win-title"><h2>Phrase Review</h2><span class="tag">${i + 1}/${list.length}</span></div>
        <div class="question center" style="font-size:1.3rem">${esc(p.phrase)}</div>
        <div class="row" style="justify-content:center"><button class="btn sm ghost" id="pr-say">🔊 Hear it</button></div>
        <p class="small muted center">Say a sentence of your own using this phrase, then reveal.</p>
        ${shown ? `<div class="item center">${esc(p.meaning || '(no meaning saved)')}</div><div class="row mt"><button class="btn danger" style="flex:1" id="pr-again">Again</button><button class="btn" style="flex:1" id="pr-good">Got it</button></div>`
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

// ================= RAID (tests, side quests, achievements) =================
function vRaid(D) {
  const tab = SUB.raid || 'raid';
  const tabs = `<div class="tabs">${[['raid', 'Raids'], ['side', 'Side Quests'], ['ach', 'Titles']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'raid') {
    const done = (r) => S.tests.some((t) => t.date >= addDays(r.date, -3) && t.date <= addDays(r.date, 7) && t.id !== 'baseline-efset');
    body = `<div class="sys-msg"><b>[ RAID ]</b> Raids are real EF SET 4-skill tests (90 min, free). They are the <b style="color:var(--text)">only</b> thing that changes your ability stats.</div>
    <div class="win"><div class="win-title"><h2>Raid schedule</h2></div>
      ${RAIDS.map((r) => `<div class="item row between ${done(r) ? 'done' : ''}"><div><b>${esc(r.name)}</b><div class="small muted">${fmtDate(r.date)}</div></div><span class="head">${done(r) ? '<span class="check">CLEARED</span>' : r.date < D.t ? '<span style="color:var(--red)">MISSED</span>' : daysBetween(D.t, r.date) + 'd'}</span></div>`).join('')}
      <a class="btn full mt" href="https://www.efset.org/4-skill" target="_blank" rel="noopener">Open EF SET 4-skill ↗</a></div>
    <div class="win"><div class="win-title"><h2>Ability chart</h2><span class="tag">GOLD = TARGET</span></div>${chart()}</div>
    <div class="win"><div class="win-title"><h2>Record a result</h2></div>
      <div class="grid2"><div><label>Date</label><input id="t-date" type="date" value="${D.t}" /></div><div><label>Source</label><input id="t-src" value="EF SET" maxlength="40" /></div></div>
      <div class="grid2">${['reading', 'listening', 'writing', 'speaking'].map((k) => `<div><label>${k} (0-100)</label><input id="t-${k}" type="number" min="0" max="100" inputmode="numeric" /></div>`).join('')}</div>
      <label>Certificate link / note</label><input id="t-note" maxlength="200" placeholder="cert.efset.org/…" />
      <button class="btn gold full mt" id="t-save">Record raid result (+600 XP)</button></div>
    <div class="win"><div class="win-title"><h2>History</h2></div>${[...S.tests].reverse().map((t) => { const ov = Math.round((t.reading + t.listening + t.writing + t.speaking) / 4); return `<div class="item"><div class="row between"><b>${fmtDate(t.date)} · ${esc(t.source)}</b><span class="head">${ov} · ${cefrOf(ov)}</span></div><div class="small muted">R ${t.reading} · L ${t.listening} · W ${t.writing} · S ${t.speaking}${t.note ? ' · ' + esc(t.note) : ''}</div>${t.id !== 'baseline-efset' ? `<button class="btn sm ghost mt" data-del-test="${t.id}">Delete</button>` : ''}</div>`; }).join('')}</div>`;
  } else if (tab === 'side') {
    const last = {}; for (const q of S.quests) if (!last[q.ref] || q.date > last[q.ref]) last[q.ref] = q.date;
    body = `<div class="sys-msg"><b>[ SIDE QUESTS ]</b> Official / tested platforms for what this System cannot measure (especially pronunciation). +120 XP each. Use the timer in Daily Quest to log the time spent.</div>
    ${SIDE_QUESTS.map((q) => { const l = last[q.key]; const ago = l ? daysBetween(l, D.t) : null; const due = ago === null || ago >= q.every; return `<div class="win ${due ? '' : 'cleared'}"><div class="row between"><h3>${esc(q.name)}</h3><span class="chip ${due ? 'on' : ''}">${due ? 'AVAILABLE' : `in ${q.every - ago}d`}</span></div>
      <p class="small muted">${esc(q.why)} · every ${q.every} days${l ? ` · last ${fmtDate(l)}` : ''}</p>
      <div class="row"><a class="btn sm" href="${q.url}" target="_blank" rel="noopener">Open ↗</a><button class="btn sm ghost" data-sq="${q.key}" ${l === D.t ? 'disabled' : ''}>Mark complete</button></div></div>`; }).join('')}`;
  } else {
    const a = achievements(D);
    body = `<div class="win"><div class="win-title"><h2>Titles</h2><span class="tag">${a.filter((x) => x.got).length}/${a.length}</span></div><div class="ach-grid">${a.map((x) => `<div class="ach ${x.got ? 'got' : ''}"><div class="ic">${x.ic}</div><div class="n">${esc(x.name)}</div><div class="d">${esc(x.desc)}</div></div>`).join('')}</div></div>
    <div class="win"><div class="win-title"><h2>Records</h2></div><div class="kpis"><div class="kpi"><div class="v">${D.best}</div><div class="l">Best streak</div></div><div class="kpi"><div class="v">${S.attempts.length}</div><div class="l">Recent gates</div></div><div class="kpi"><div class="v">${D.bestBand || '–'}</div><div class="l">Best band</div></div></div></div>`;
  }
  $('#app').innerHTML = tabs + body;
  $$('[data-t]').forEach((b) => (b.onclick = () => { SUB.raid = b.dataset.t; render(); }));
  if ($('#t-save')) $('#t-save').onclick = async () => {
    const b = { date: $('#t-date').value, source: $('#t-src').value, note: $('#t-note').value };
    for (const k of ['reading', 'listening', 'writing', 'speaking']) b[k] = $('#t-' + k).value;
    if (['reading', 'listening', 'writing', 'speaking'].some((k) => b[k] === '')) return toast('Enter all four scores.', 'err');
    try { await api('/api/tests', { body: b }); toast('Raid result recorded. Abilities re-evaluated.', 'gold', 'RAID CLEAR'); await refresh(); render(); } catch (e) { toast(esc(e.message), 'err'); }
  };
  $$('[data-del-test]').forEach((b) => (b.onclick = async () => { if (!confirm('Delete this test result?')) return; await api('/api/tests/' + b.dataset.delTest, { method: 'DELETE' }); await refresh(); render(); }));
  $$('[data-sq]').forEach((b) => (b.onclick = async () => { try { await api('/api/quests', { body: { date: today(), key: b.dataset.sq } }); toast('Side quest complete. +120 XP', 'gold', 'QUEST'); await refresh(); render(); } catch (e) { toast(esc(e.message), 'err'); } }));
}

function chart() {
  const tests = S.tests; if (!tests.length) return '<p class="muted">No data.</p>';
  const W = 600, H = 240, pad = { l: 34, r: 12, t: 12, b: 26 };
  const start = tests[0].date, end = END_DATE; const span = Math.max(1, daysBetween(start, end));
  const x = (d) => pad.l + (daysBetween(start, d) / span) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - 30) / 50) * (H - pad.t - pad.b); // 30..80 range
  const colors = { reading: '#4fc3ff', listening: '#9b6bff', writing: '#4be3a0', speaking: '#ff9f43' };
  let g = '';
  for (const v of [30, 41, 51, 61, 71, 80]) g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(84,168,255,.12)"/><text x="4" y="${y(v) + 4}" fill="#8296bd" font-size="10">${v === 80 ? '' : v + ' ' + cefrOf(v)}</text>`;
  for (const k of Object.keys(colors)) {
    g += `<line x1="${x(start)}" x2="${x(end)}" y1="${y(TARGETS[k])}" y2="${y(TARGETS[k])}" stroke="${colors[k]}" stroke-dasharray="3 5" opacity=".45"/>`;
    const pts = tests.map((t) => `${x(t.date)},${y(Math.max(30, Math.min(80, t[k])))}`).join(' ');
    g += `<polyline points="${pts}" fill="none" stroke="${colors[k]}" stroke-width="2.5"/>`;
    g += tests.map((t) => `<circle cx="${x(t.date)}" cy="${y(Math.max(30, Math.min(80, t[k])))}" r="4" fill="${colors[k]}"/>`).join('');
  }
  for (const r of RAIDS) g += `<text x="${x(r.date)}" y="${H - 8}" fill="#8296bd" font-size="10" text-anchor="middle">${fmtDate(r.date)}</text>`;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Skill scores over time">${g}</svg></div><div class="legend">${Object.entries(colors).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join('')}<span class="muted">dashed = target</span></div>`;
}

// ================= SYSTEM (settings + device check) =================
function vSystem() {
  const sr = Recorder.supported(), tts = 'speechSynthesis' in window;
  const ua = navigator.userAgent; const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  $('#app').innerHTML = `
  <div class="win"><div class="win-title"><h2>System check</h2><span class="tag">RUN ON EACH DEVICE</span></div>
    <div class="item row between"><span>Text-to-speech</span><b class="${tts ? 'right' : 'wrong'}">${tts ? 'Available' : 'Missing'}</b></div>
    <div class="item row between"><span>Speech recognition</span><b class="${sr ? 'right' : 'wrong'}">${sr ? 'Available' : 'Missing'}</b></div>
    ${standalone && /iPhone|iPad/.test(ua) ? '<div class="sys-msg small">You opened the app from the Home Screen. If the mic test fails, open it in a normal Safari tab instead.</div>' : ''}
    <button class="btn full mt" id="c-tts">1 · Test voice output</button>
    <button class="btn full mt" id="c-sr">2 · Test microphone (say: "I am a hunter")</button>
    <div class="item mt" id="c-out" style="min-height:44px"><span class="muted small">Recognised text appears here.</span></div>
    <p class="small muted">iPhone: use Safari, allow the microphone, and keep Siri switched on (Settings › Siri). Samsung Tab: use Chrome or Samsung Internet. If recognition fails, every speaking gate still works with keyboard dictation (the mic key on your keyboard).</p></div>
  <div class="win"><div class="win-title"><h2>Mana</h2><span class="tag">AI EXAMINER</span></div>
    <p>${S.mana.max - S.mana.used} of ${S.mana.max} casts left today. Each AI-scored gate costs 1. Resets 07:00 WIB. Offline gates, drills and reviews are free.</p></div>
  <div class="win"><div class="win-title"><h2>Account</h2></div>
    <p class="small muted">Hunter: ${esc(S.name)} · Data stored in your Cloudflare D1 database, synced across devices.</p>
    <button class="btn danger full" id="c-out-btn">Sign out on this device</button></div>
  <button class="btn ghost full" data-go="status">← Back</button>`;
  bindGo();
  $('#c-tts').onclick = () => speak('System check complete. Welcome, Hunter.');
  let rec = null;
  $('#c-sr').onclick = () => {
    if (rec?.active) { rec.stop(); $('#c-sr').textContent = '2 · Test microphone (say: "I am a hunter")'; $('#c-sr').classList.remove('rec'); return; }
    rec = new Recorder((t) => { $('#c-out').textContent = t || '…'; });
    if (rec.start('')) { $('#c-sr').textContent = '■ Stop'; $('#c-sr').classList.add('rec'); }
  };
  $('#c-out-btn').onclick = async () => { try { await api('/api/auth/logout', { body: {} }); } catch { /* ignore */ } TOKEN = null; store.del('eh_token'); boot(); };
}

// refresh when the app comes back to the foreground (e.g. switching iPhone ↔ Tab)
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && TOKEN && S && !RUN) { try { await refresh(); render(); } catch { /* ignore */ } }
});

boot();
