const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { getAllAchievementDefs } = require('../utils/achievements');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ achievements: getAllAchievementDefs() });
});

router.get('/mine', authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT a.key, a.name, a.description, a.icon, ua.earned_at
    FROM user_achievements ua
    JOIN achievements a ON a.id = ua.achievement_id
    WHERE ua.user_id = ?
    ORDER BY ua.earned_at DESC
  `).all(req.user.id);
  res.json({ earned: rows });
});

router.get('/progress', authRequired, (req, res) => {
  const { getProgress } = require('../utils/achievements');
  res.json({ progress: getProgress(req.user.id) });
});

module.exports = router;
