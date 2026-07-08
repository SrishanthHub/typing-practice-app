const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { touchStreak } = require('../utils/streaks');
const { evaluateAndAward } = require('../utils/achievements');
const { generateWords, getRandomQuote, getRandomCodeSnippet, mulberry32, seedFromDate } = require('../utils/generator');

const router = express.Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getOrCreateTodayChallenge() {
  const date = todayStr();
  let challenge = db.prepare('SELECT * FROM daily_challenges WHERE challenge_date = ?').get(date);
  if (challenge) return challenge;

  const rng = mulberry32(seedFromDate(date));
  // Rotate challenge type by day-of-year for variety: words -> quote -> code
  const dayOfYear = Math.floor((new Date(date) - new Date(date.slice(0, 4) + '-01-01')) / 86400000);
  const kind = dayOfYear % 3;

  let mode, modeValue, content, contentType;
  if (kind === 0) {
    mode = 'words'; modeValue = '40';
    content = generateWords(40, rng);
    contentType = 'text';
  } else if (kind === 1) {
    mode = 'quote'; modeValue = 'daily';
    content = getRandomQuote(rng).text;
    contentType = 'text';
  } else {
    mode = 'code'; modeValue = 'daily';
    content = getRandomCodeSnippet(rng).code;
    contentType = 'code';
  }

  const info = db.prepare(`
    INSERT INTO daily_challenges (challenge_date, mode, mode_value, content, content_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(date, mode, modeValue, content, contentType);

  return db.prepare('SELECT * FROM daily_challenges WHERE id = ?').get(info.lastInsertRowid);
}

router.get('/', (req, res) => {
  const challenge = getOrCreateTodayChallenge();
  res.json({ challenge });
});

router.get('/mine', authRequired, (req, res) => {
  const challenge = getOrCreateTodayChallenge();
  const result = db.prepare(
    'SELECT * FROM daily_challenge_results WHERE daily_challenge_id = ? AND user_id = ?'
  ).get(challenge.id, req.user.id);
  res.json({ completed: !!result, result: result || null });
});

router.post('/submit', authRequired, (req, res) => {
  const userId = req.user.id;
  const { wpm, accuracy } = req.body;
  if (wpm == null || accuracy == null) {
    return res.status(400).json({ error: 'wpm and accuracy are required' });
  }
  const challenge = getOrCreateTodayChallenge();

  const existing = db.prepare(
    'SELECT * FROM daily_challenge_results WHERE daily_challenge_id = ? AND user_id = ?'
  ).get(challenge.id, userId);
  if (existing) {
    return res.status(409).json({ error: 'Already completed today\'s challenge', result: existing });
  }

  db.prepare(`
    INSERT INTO daily_challenge_results (daily_challenge_id, user_id, wpm, accuracy)
    VALUES (?, ?, ?, ?)
  `).run(challenge.id, userId, wpm, accuracy);

  const streak = touchStreak(userId);
  const dailyChallengesCompleted = db.prepare(
    'SELECT COUNT(*) c FROM daily_challenge_results WHERE user_id = ?'
  ).get(userId).c;
  const totalTests = db.prepare('SELECT COUNT(*) c FROM test_results WHERE user_id = ?').get(userId).c;

  const newAchievements = evaluateAndAward(userId, {
    result: { wpm, accuracy, correct_chars: 0 },
    totalTests,
    currentStreak: streak.current_streak,
    codeTestsCount: 0,
    customTextsShared: 0,
    dailyChallengesCompleted,
    last5Accuracy: []
  });

  res.status(201).json({ success: true, streak, newAchievements });
});

router.get('/leaderboard', (req, res) => {
  const challenge = getOrCreateTodayChallenge();
  const rows = db.prepare(`
    SELECT dcr.wpm, dcr.accuracy, dcr.completed_at, u.username
    FROM daily_challenge_results dcr
    JOIN users u ON u.id = dcr.user_id
    WHERE dcr.daily_challenge_id = ?
    ORDER BY dcr.wpm DESC
    LIMIT 50
  `).all(challenge.id);
  res.json({ leaderboard: rows });
});

module.exports = router;
