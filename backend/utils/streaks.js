const db = require('../db');

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysBetween(d1, d2) {
  const a = new Date(d1 + 'T00:00:00Z');
  const b = new Date(d2 + 'T00:00:00Z');
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// Call once per "activity" (completed test) per day. Returns updated { current_streak, longest_streak }.
function touchStreak(userId) {
  const today = todayStr();
  let row = db.prepare('SELECT * FROM streaks WHERE user_id = ?').get(userId);

  if (!row) {
    db.prepare(
      'INSERT INTO streaks (user_id, current_streak, longest_streak, last_active_date) VALUES (?, 1, 1, ?)'
    ).run(userId, today);
    return { current_streak: 1, longest_streak: 1 };
  }

  if (row.last_active_date === today) {
    // already counted today
    return { current_streak: row.current_streak, longest_streak: row.longest_streak };
  }

  const gap = daysBetween(row.last_active_date, today);
  let current = row.current_streak;
  if (gap === 1) {
    current += 1;
  } else if (gap > 1) {
    current = 1;
  } else {
    current = row.current_streak; // shouldn't happen (negative gap)
  }
  const longest = Math.max(row.longest_streak, current);

  db.prepare(
    'UPDATE streaks SET current_streak = ?, longest_streak = ?, last_active_date = ? WHERE user_id = ?'
  ).run(current, longest, today, userId);

  return { current_streak: current, longest_streak: longest };
}

function getStreak(userId) {
  const row = db.prepare('SELECT current_streak, longest_streak, last_active_date FROM streaks WHERE user_id = ?').get(userId);
  if (!row) return { current_streak: 0, longest_streak: 0, last_active_date: null };
  // If last active wasn't today or yesterday, the current streak is effectively broken (display-wise)
  const today = todayStr();
  const gap = daysBetween(row.last_active_date, today);
  if (gap > 1) {
    return { current_streak: 0, longest_streak: row.longest_streak, last_active_date: row.last_active_date };
  }
  return row;
}

module.exports = { touchStreak, getStreak, todayStr };
