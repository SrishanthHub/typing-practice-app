const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
require('dotenv').config();

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DB_PATH
  ? path.resolve(__dirname, process.env.DB_PATH)
  : path.join(dataDir, 'typing_app.sqlite');

// This object is exported immediately and populated in-place once init() resolves,
// so every `require('./db')` across the app shares the same live instance.
const db = { ready: false };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  mode_value TEXT,
  wpm REAL NOT NULL,
  raw_wpm REAL NOT NULL,
  accuracy REAL NOT NULL,
  consistency REAL DEFAULT 0,
  correct_chars INTEGER DEFAULT 0,
  incorrect_chars INTEGER DEFAULT 0,
  extra_chars INTEGER DEFAULT 0,
  missed_chars INTEGER DEFAULT 0,
  duration_seconds REAL DEFAULT 0,
  char_error_map TEXT,
  wpm_history TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS custom_texts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  language TEXT,
  content TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS streaks (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT
);

CREATE TABLE IF NOT EXISTS daily_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_date TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL,
  mode_value TEXT,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text'
);

CREATE TABLE IF NOT EXISTS daily_challenge_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  daily_challenge_id INTEGER NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wpm REAL NOT NULL,
  accuracy REAL NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(daily_challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_test_results_user ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_mode ON test_results(mode, mode_value);
`;

async function init() {
  if (db.ready) return db;

  const SQL = await initSqlJs();
  let sqljsDb;
  if (fs.existsSync(dbPath)) {
    sqljsDb = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    sqljsDb = new SQL.Database();
  }
  sqljsDb.exec('PRAGMA foreign_keys = ON;');
  sqljsDb.exec(SCHEMA);

  try { sqljsDb.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT;'); } catch(e) {}
  try { sqljsDb.exec('ALTER TABLE users ADD COLUMN bio TEXT;'); } catch(e) {}

  let dirty = false;
  function persist() {
    // Write-through so data survives restarts. Fine at personal-project scale;
    // batch with a transaction() call if you need to bulk-insert a lot of rows.
    fs.writeFileSync(dbPath, Buffer.from(sqljsDb.export()));
    dirty = false;
  }

  db.prepare = (sql) => ({
    run: (...params) => {
      const stmt = sqljsDb.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
      const res = sqljsDb.exec('SELECT last_insert_rowid() AS id, changes() AS ch');
      const [id, changes] = res[0] ? res[0].values[0] : [undefined, 0];
      dirty = true;
      persist();
      return { lastInsertRowid: id, changes };
    },
    get: (...params) => {
      const stmt = sqljsDb.prepare(sql);
      stmt.bind(params);
      let result;
      if (stmt.step()) result = stmt.getAsObject();
      stmt.free();
      return result;
    },
    all: (...params) => {
      const stmt = sqljsDb.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    }
  });

  db.exec = (sql) => {
    sqljsDb.exec(sql);
    dirty = true;
    persist();
  };

  // better-sqlite3-style transaction shim: batches writes, persists once at the end.
  db.transaction = (fn) => (...args) => {
    const result = fn(...args);
    if (dirty) persist();
    return result;
  };

  db.pragma = () => {}; // no-op compatibility shim (WAL mode not applicable to sql.js)

  db.ready = true;
  return db;
}

module.exports = db;
module.exports.init = init;
