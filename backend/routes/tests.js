const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { touchStreak, getStreak } = require('../utils/streaks');
const { evaluateAndAward } = require('../utils/achievements');

const router = express.Router();

router.post('/', authRequired, (req, res) => {
  try {
    const userId = req.user.id;
    const {
      mode, modeValue, wpm, rawWpm, accuracy, consistency,
      correctChars, incorrectChars, extraChars, missedChars,
      durationSeconds, charErrorMap, wpmHistory
    } = req.body;

    if (!mode || wpm == null || accuracy == null) {
      return res.status(400).json({ error: 'mode, wpm and accuracy are required' });
    }

    const info = db.prepare(`
      INSERT INTO test_results
        (user_id, mode, mode_value, wpm, raw_wpm, accuracy, consistency,
         correct_chars, incorrect_chars, extra_chars, missed_chars,
         duration_seconds, char_error_map, wpm_history)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, mode, String(modeValue ?? ''), wpm, rawWpm ?? wpm, accuracy, consistency ?? 0,
      correctChars ?? 0, incorrectChars ?? 0, extraChars ?? 0, missedChars ?? 0,
      durationSeconds ?? 0, JSON.stringify(charErrorMap || {}), JSON.stringify(wpmHistory || [])
    );

    const streak = touchStreak(userId);

    const totalTests = db.prepare('SELECT COUNT(*) c FROM test_results WHERE user_id = ?').get(userId).c;
    const codeTestsCount = db.prepare("SELECT COUNT(*) c FROM test_results WHERE user_id = ? AND mode = 'code'").get(userId).c;
    const customTextsShared = db.prepare('SELECT COUNT(*) c FROM custom_texts WHERE user_id = ? AND is_public = 1').get(userId).c;
    const dailyChallengesCompleted = db.prepare('SELECT COUNT(*) c FROM daily_challenge_results WHERE user_id = ?').get(userId).c;
    const last5 = db.prepare('SELECT accuracy FROM test_results WHERE user_id = ? ORDER BY id DESC LIMIT 5').all(userId);

    const resultRow = db.prepare('SELECT * FROM test_results WHERE id = ?').get(info.lastInsertRowid);

    const newAchievements = evaluateAndAward(userId, {
      result: resultRow,
      totalTests,
      currentStreak: streak.current_streak,
      codeTestsCount,
      customTextsShared,
      dailyChallengesCompleted,
      last5Accuracy: last5.map(r => r.accuracy)
    });

    res.status(201).json({
      result: resultRow,
      streak,
      newAchievements
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save test result' });
  }
});

router.get('/history', authRequired, (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const rows = db.prepare(
    'SELECT * FROM test_results WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
  ).all(userId, limit, offset);
  res.json({ results: rows.map(parseResultJson) });
});

router.get('/stats', authRequired, (req, res) => {
  const userId = req.user.id;
  const rows = db.prepare('SELECT * FROM test_results WHERE user_id = ? ORDER BY id ASC').all(userId);

  if (rows.length === 0) {
    return res.json({
      totalTests: 0, avgWpm: 0, bestWpm: 0, avgAccuracy: 0,
      wpmOverTime: [], charErrorHeatmap: {}, streak: getStreak(userId)
    });
  }

  const totalTests = rows.length;
  const avgWpm = round1(rows.reduce((s, r) => s + r.wpm, 0) / totalTests);
  const bestWpm = round1(Math.max(...rows.map(r => r.wpm)));
  const avgAccuracy = round1(rows.reduce((s, r) => s + r.accuracy, 0) / totalTests);

  const wpmOverTime = rows.slice(-100).map(r => ({
    date: r.created_at,
    wpm: r.wpm,
    accuracy: r.accuracy,
    mode: r.mode
  }));

  const charErrorHeatmap = {};
  for (const r of rows) {
    try {
      const map = JSON.parse(r.char_error_map || '{}');
      for (const [ch, count] of Object.entries(map)) {
        charErrorHeatmap[ch] = (charErrorHeatmap[ch] || 0) + count;
      }
    } catch (e) { /* ignore malformed rows */ }
  }

  res.json({
    totalTests, avgWpm, bestWpm, avgAccuracy,
    wpmOverTime, charErrorHeatmap, streak: getStreak(userId)
  });
});

function parseResultJson(r) {
  return {
    ...r,
    char_error_map: safeParse(r.char_error_map, {}),
    wpm_history: safeParse(r.wpm_history, [])
  };
}
function safeParse(str, fallback) {
  try { return JSON.parse(str); } catch (e) { return fallback; }
}
function round1(n) { return Math.round(n * 10) / 10; }

module.exports = router;
