const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const DB_PATH = path.join(__dirname, '..', '..', 'db', 'app.db');

// Ensure the db directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let client;

function getDb() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || `file:${DB_PATH}`,
      authToken: process.env.TURSO_AUTH_TOKEN
    });
  }
  return client;
}

async function initializeDatabase() {
  try {
    const db = getDb();

    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        type TEXT,
        media_url TEXT,
        verdict TEXT,
        confidence INTEGER,
        signals_json TEXT,
        explanation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS token_usage (
        date TEXT PRIMARY KEY,
        tokens_used INTEGER DEFAULT 0
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS benchmark_results (
        image_id TEXT PRIMARY KEY,
        ground_truth TEXT,
        verdict TEXT,
        confidence INTEGER,
        ran_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

    for (const sql of migrations) {
      try {
        await db.execute(sql);
      } catch (err) {
        // Column already exists — this is expected and safe to ignore
        // SQLite throws when column already exists, not when it doesn't
      }
    }

    console.log('[DB] Migrations applied successfully');

    console.log('[DB] Database path:', process.env.TURSO_DATABASE_URL ? 'Turso Cloud' : DB_PATH);
    console.log('[DB] Tables created successfully');
  } catch (err) {
    console.error('[DB] FATAL: Could not initialize database:', err.message);
    console.error('[DB] Stack:', err.stack);
  }
}

module.exports = { getDb, initializeDatabase };
