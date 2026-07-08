const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/leaderboard?mode=time&modeValue=30&limit=20
router.get('/', (req, res) => {
  const mode = req.query.mode || 'time';
  const modeValue = req.query.modeValue != null ? String(req.query.modeValue) : null;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  let rows;
  if (modeValue) {
    rows = db.prepare(`
      SELECT tr.wpm, tr.accuracy, tr.created_at, u.username
      FROM test_results tr
      JOIN users u ON u.id = tr.user_id
      WHERE tr.mode = ? AND tr.mode_value = ?
      ORDER BY tr.wpm DESC
      LIMIT ?
    `).all(mode, modeValue, limit);
  } else {
    rows = db.prepare(`
      SELECT tr.wpm, tr.accuracy, tr.created_at, u.username
      FROM test_results tr
      JOIN users u ON u.id = tr.user_id
      WHERE tr.mode = ?
      ORDER BY tr.wpm DESC
      LIMIT ?
    `).all(mode, limit);
  }

  res.json({ leaderboard: rows });
});

module.exports = router;
