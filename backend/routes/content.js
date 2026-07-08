const express = require('express');
const { generateWords, getRandomQuote, getRandomCodeSnippet } = require('../utils/generator');

const router = express.Router();

// GET /api/content/words?count=50
router.get('/words', (req, res) => {
  const count = Math.min(Math.max(parseInt(req.query.count) || 50, 5), 300);
  res.json({ content: generateWords(count), type: 'text' });
});

router.get('/quote', (req, res) => {
  const q = getRandomQuote();
  res.json({ content: q.text, source: q.source, type: 'text' });
});

router.get('/code', (req, res) => {
  const snippet = getRandomCodeSnippet();
  res.json({ content: snippet.code, language: snippet.language, type: 'code' });
});

module.exports = router;
