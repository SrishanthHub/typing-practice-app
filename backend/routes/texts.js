const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/', authRequired, (req, res) => {
  const userId = req.user.id;
  const { title, type, language, content, isPublic } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }
  if (content.length > 20000) {
    return res.status(400).json({ error: 'content too long (max 20000 characters)' });
  }
  const finalType = type === 'code' ? 'code' : 'text';

  const info = db.prepare(`
    INSERT INTO custom_texts (user_id, title, type, language, content, is_public)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, title, finalType, language || null, content, isPublic === false ? 0 : 1);

  const row = db.prepare('SELECT * FROM custom_texts WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ text: row });
});

router.get('/mine', authRequired, (req, res) => {
  const rows = db.prepare('SELECT * FROM custom_texts WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json({ texts: rows });
});

router.get('/public', (req, res) => {
  const type = req.query.type; // optional filter: 'text' | 'code'
  let rows;
  if (type) {
    rows = db.prepare(`
      SELECT ct.*, u.username FROM custom_texts ct
      JOIN users u ON u.id = ct.user_id
      WHERE ct.is_public = 1 AND ct.type = ?
      ORDER BY ct.id DESC LIMIT 100
    `).all(type);
  } else {
    rows = db.prepare(`
      SELECT ct.*, u.username FROM custom_texts ct
      JOIN users u ON u.id = ct.user_id
      WHERE ct.is_public = 1
      ORDER BY ct.id DESC LIMIT 100
    `).all();
  }
  res.json({ texts: rows });
});

router.delete('/:id', authRequired, (req, res) => {
  const row = db.prepare('SELECT * FROM custom_texts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Not your text' });
  db.prepare('DELETE FROM custom_texts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
