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
  try {
    const db = getDb();

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        type TEXT,
        media_url TEXT,
        verdict TEXT,
        confidence INTEGER,
        signals_json TEXT,
        explanation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS token_usage (
        date TEXT PRIMARY KEY,
        tokens_used INTEGER DEFAULT 0
      )
    `);

    console.log('[DB] Database path:', DB_PATH);
    console.log('[DB] Tables created successfully');
  } catch (err) {
    console.error('[DB] FATAL: Could not initialize database:', err.message);
    console.error('[DB] Stack:', err.stack);
  }
}

module.exports = { getDb, initializeDatabase };
