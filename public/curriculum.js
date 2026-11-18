// English Command — curriculum logic: diagnostic, pacing, mastery, reviews, unit tests.
import { LESSONS, UNITS } from './grammar.js';

export const LEVELS = ['Not started', 'Attempted', 'Familiar', 'Proficient', 'Mastered'];
export const LEVEL_HINT = [
  'Not practised yet.',
  'Practised, but under 70% on the last check.',
  '70–99% on a check. Pass with 100% to reach Proficient.',
  '100% on a check. A later review with 100% makes it Mastered.',
  'Proven twice, days apart. Reviewed every 3 weeks to keep it.',
];

const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const tag = (l) => (q) => ({ ...q, lesson: l.id });

// Diagnostic: 2 questions per lesson. 2/2 → Familiar (skip the reading, confirm later), otherwise Attempted.
export const diagnosticQuestions = () => LESSONS.flatMap((l) => l.check.slice(0, 2).map(tag(l)));
// Pre-check before reading (test → explain → test again)
export const preCheck = (l) => l.check.slice(0, 2).map(tag(l));
export const fullCheck = (l) => shuffle(l.check).map(tag(l));
export const reviewQuestions = (l) => shuffle(l.check).slice(0, 3).map(tag(l));
export const unitQuestions = (unitId) => shuffle(LESSONS.filter((l) => l.unit === unitId).flatMap((l) => shuffle(l.check).slice(0, 2).map(tag(l))));

// Per-lesson score from a mixed quiz
export function scoreByLesson(answers) {
  const by = {};
  for (const a of answers) { (by[a.lesson] ||= { right: 0, n: 0 }); by[a.lesson].n++; if (a.ok) by[a.lesson].right++; }
  return Object.entries(by).map(([lesson, v]) => ({ lesson, score: Math.round((v.right / v.n) * 100) }));
}

// Lessons spread evenly from start to (end − 14 days); the last two weeks are for full simulations.
export function schedule(profile) {
  const span = Math.max(28, daysBetween(profile.start, profile.end) - 14);
  const per = span / LESSONS.length;
  return LESSONS.map((l, i) => ({ id: l.id, due: addDays(profile.start, Math.round((i + 1) * per)) }));
}

export function courseState(masteryRows, profile, today) {
  const M = Object.fromEntries(masteryRows.map((r) => [r.lesson_id, r]));
  const level = (id) => M[id]?.level || 0;
  const sched = schedule(profile);
  const expected = sched.filter((s) => s.due <= today).length;
  const learned = LESSONS.filter((l) => level(l.id) >= 2).length; // Familiar or better
  const proficient = LESSONS.filter((l) => level(l.id) >= 3).length;
  const mastered = LESSONS.filter((l) => level(l.id) >= 4).length;
  const current = LESSONS.find((l) => level(l.id) < 2) || null;
  const due = LESSONS.filter((l) => level(l.id) >= 2 && M[l.id]?.next_review && M[l.id].next_review <= today)
    .sort((a, b) => M[a.id].next_review.localeCompare(M[b.id].next_review));
  const units = UNITS.map((u) => {
    const ls = LESSONS.filter((l) => l.unit === u.id);
    const ready = ls.every((l) => level(l.id) >= 2);
    const passed = ls.every((l) => level(l.id) >= 3);
    return { ...u, lessons: ls, ready, passed, done: ls.filter((l) => level(l.id) >= 3).length };
  });
  const unitTest = units.find((u) => u.ready && !u.passed) || null;
  // pace: lessons learned per week since start → estimated finish
  const weeks = Math.max(1, daysBetween(profile.start, today) / 7);
  const rate = learned / weeks;
  const eta = rate > 0 ? addDays(today, Math.ceil(((LESSONS.length - learned) / rate) * 7)) : null;
  const dueOf = Object.fromEntries(sched.map((s) => [s.id, s.due]));
  return {
    M, level, expected, learned, proficient, mastered, current, due, units, unitTest, eta, dueOf,
    diagnosed: masteryRows.length > 0,
    masteryPct: Math.round((proficient / LESSONS.length) * 100),
    behind: Math.max(0, expected - learned),
    ahead: Math.max(0, learned - expected),
  };
}
