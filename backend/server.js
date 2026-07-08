require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./db');

async function start() {
  await db.init(); // sql.js loads its WASM binary asynchronously

  const { seedAchievements } = require('./utils/achievements');
  seedAchievements();

  const authRoutes = require('./routes/auth');
  const testRoutes = require('./routes/tests');
  const leaderboardRoutes = require('./routes/leaderboard');
  const textRoutes = require('./routes/texts');
  const achievementRoutes = require('./routes/achievements');
  const dailyChallengeRoutes = require('./routes/dailyChallenge');
  const contentRoutes = require('./routes/content');
  const uploadRoutes = require('./routes/upload');

  const app = express();
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'https://typing-practice-webapp.vercel.app'
    ]
  }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/tests', testRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/texts', textRoutes);
  app.use('/api/achievements', achievementRoutes);
  app.use('/api/daily-challenge', dailyChallengeRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/upload', uploadRoutes);

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Typing app API listening on port ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
