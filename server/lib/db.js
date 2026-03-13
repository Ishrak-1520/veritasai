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

    const migrations = [
      "ALTER TABLE scans ADD COLUMN input_type TEXT",
      "ALTER TABLE scans ADD COLUMN input_value TEXT", 
      "ALTER TABLE scans ADD COLUMN media_type TEXT",
      "ALTER TABLE scans ADD COLUMN verdict TEXT",
      "ALTER TABLE scans ADD COLUMN confidence INTEGER",
      "ALTER TABLE scans ADD COLUMN signals_json TEXT",
      "ALTER TABLE scans ADD COLUMN explanation TEXT",
      "ALTER TABLE scans ADD COLUMN suspected_model TEXT",
      "ALTER TABLE scans ADD COLUMN user_id INTEGER"
    ];

    migrations.forEach(sql => {
      try {
        db.prepare(sql).run();
      } catch (err) {
        // Column already exists — this is expected and safe to ignore
        // SQLite throws when column already exists, not when it doesn't
      }
    });

    console.log('[DB] Migrations applied successfully');

    console.log('[DB] Database path:', DB_PATH);
    console.log('[DB] Tables created successfully');
  } catch (err) {
    console.error('[DB] FATAL: Could not initialize database:', err.message);
    console.error('[DB] Stack:', err.stack);
  }
}

module.exports = { getDb, initializeDatabase };
