const db = require('../db');

// Each achievement has a key, display info, and a check(context) => boolean function.
// context = { result, totalTests, bestWpm, bestAccuracy, currentStreak, avgWpm }
const ACHIEVEMENTS = [
  {
    key: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first typing test.',
    icon: '🐣',
    target: 1, progressKey: 'totalTests',
    check: (ctx) => ctx.totalTests >= 1
  },
  {
    key: 'getting_warmed_up',
    name: 'Getting Warmed Up',
    description: 'Complete 10 typing tests.',
    icon: '🔥',
    target: 10, progressKey: 'totalTests',
    check: (ctx) => ctx.totalTests >= 10
  },
  {
    key: 'marathoner',
    name: 'Marathoner',
    description: 'Complete 100 typing tests.',
    icon: '🏃',
    target: 100, progressKey: 'totalTests',
    check: (ctx) => ctx.totalTests >= 100
  },
  {
    key: 'speed_demon',
    name: 'Speed Demon',
    description: 'Reach 80 WPM in a single test.',
    icon: '⚡',
    target: 80, progressKey: 'bestWpm',
    check: (ctx) => ctx.result.wpm >= 80
  },
  {
    key: 'century_club',
    name: 'Century Club',
    description: 'Reach 100 WPM in a single test.',
    icon: '💯',
    target: 100, progressKey: 'bestWpm',
    check: (ctx) => ctx.result.wpm >= 100
  },
  {
    key: 'perfectionist',
    name: 'Perfectionist',
    description: 'Score 100% accuracy on a test of 25+ words.',
    icon: '🎯',
    check: (ctx) => ctx.result.accuracy >= 100 && ctx.result.correct_chars >= 100
  },
  {
    key: 'sharp_shooter',
    name: 'Sharp Shooter',
    description: 'Maintain 98%+ accuracy on 5 tests in a row.',
    icon: '🏹',
    check: (ctx) => ctx.last5Accuracy && ctx.last5Accuracy.length >= 5 && ctx.last5Accuracy.every(a => a >= 98)
  },
  {
    key: 'week_streak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day practice streak.',
    icon: '📅',
    target: 7, progressKey: 'currentStreak',
    check: (ctx) => ctx.currentStreak >= 7
  },
  {
    key: 'month_streak',
    name: 'Unstoppable',
    description: 'Maintain a 30-day practice streak.',
    icon: '🌟',
    target: 30, progressKey: 'currentStreak',
    check: (ctx) => ctx.currentStreak >= 30
  },
  {
    key: 'coder_at_heart',
    name: 'Coder at Heart',
    description: 'Complete 10 tests in code mode.',
    icon: '👨‍💻',
    target: 10, progressKey: 'codeTestsCount',
    check: (ctx) => ctx.codeTestsCount >= 10
  },
  {
    key: 'wordsmith',
    name: 'Wordsmith',
    description: 'Share a custom text with the community.',
    icon: '✍️',
    target: 1, progressKey: 'customTextsShared',
    check: (ctx) => ctx.customTextsShared >= 1
  },
  {
    key: 'daily_devotee',
    name: 'Daily Devotee',
    description: 'Complete 5 daily challenges.',
    icon: '🗓️',
    target: 5, progressKey: 'dailyChallengesCompleted',
    check: (ctx) => ctx.dailyChallengesCompleted >= 5
  }
];

function seedAchievements() {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO achievements (key, name, description, icon) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction((items) => {
    for (const a of items) insert.run(a.key, a.name, a.description, a.icon);
  });
  tx(ACHIEVEMENTS);
}

function getAllAchievementDefs() {
  return db.prepare('SELECT id, key, name, description, icon FROM achievements').all();
}

// Evaluates all achievements for a user given fresh context, awards new ones, returns newly earned list.
function evaluateAndAward(userId, context) {
  const already = new Set(
    db.prepare('SELECT achievement_id FROM user_achievements WHERE user_id = ?').all(userId)
      .map(r => r.achievement_id)
  );
  const defs = db.prepare('SELECT * FROM achievements').all();
  const newly = [];

  const insertUA = db.prepare(
    'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)'
  );

  for (const def of defs) {
    if (already.has(def.id)) continue;
    const spec = ACHIEVEMENTS.find(a => a.key === def.key);
    if (!spec) continue;
    let earned = false;
    try {
      earned = !!spec.check(context);
    } catch (e) {
      earned = false;
    }
    if (earned) {
      insertUA.run(userId, def.id);
      newly.push({ key: def.key, name: def.name, description: def.description, icon: def.icon });
    }
  }
  return newly;
}

function getProgress(userId) {
  const totalTests = db.prepare('SELECT COUNT(*) c FROM test_results WHERE user_id = ?').get(userId).c;
  const bestWpmRow = db.prepare('SELECT MAX(wpm) m FROM test_results WHERE user_id = ?').get(userId);
  const bestWpm = bestWpmRow.m || 0;
  // lazy require to avoid circular dep
  const streak = require('./streaks').getStreak(userId).current_streak;
  const codeTestsCount = db.prepare("SELECT COUNT(*) c FROM test_results WHERE user_id = ? AND mode = 'code'").get(userId).c;
  const customTextsShared = db.prepare('SELECT COUNT(*) c FROM custom_texts WHERE user_id = ? AND is_public = 1').get(userId).c;
  const dailyChallengesCompleted = db.prepare('SELECT COUNT(*) c FROM daily_challenge_results WHERE user_id = ?').get(userId).c;

  const ctx = {
    totalTests,
    bestWpm,
    currentStreak: streak,
    codeTestsCount,
    customTextsShared,
    dailyChallengesCompleted
  };

  const progress = {};
  for (const a of ACHIEVEMENTS) {
    if (a.target) {
      const val = ctx[a.progressKey] || 0;
      progress[a.key] = { current: Math.min(val, a.target), target: a.target };
    }
  }
  return progress;
}

module.exports = { ACHIEVEMENTS, seedAchievements, getAllAchievementDefs, evaluateAndAward, getProgress };
