const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'db', 'app.db');

// Ensure the db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initializeDatabase() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      input_type TEXT CHECK(input_type IN ('url', 'upload')),
      input_value TEXT,
      media_type TEXT CHECK(media_type IN ('image', 'video')),
      verdict TEXT CHECK(verdict IN ('AI_GENERATED', 'AUTHENTIC', 'UNCERTAIN')),
      confidence INTEGER CHECK(confidence >= 0 AND confidence <= 100),
      signals_json TEXT,
      explanation TEXT,
      suspected_model TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS token_usage (
      date TEXT PRIMARY KEY,
      tokens_used INTEGER DEFAULT 0
    );
  `);

  console.log('[DB] Database initialized successfully');
}

module.exports = { getDb, initializeDatabase };
