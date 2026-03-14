/**
 * routes/scans.js – Retrieve individual scans and authenticated user history.
 */

const express = require('express');
const { getDb } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

/**
 * Safely parse a JSON string, returning fallback on failure.
 */
function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

/**
 * Hydrate a raw scan row — parse JSON string columns back into objects.
 */
function hydrateScan(row) {
  return {
    ...row,
    signals: safeParse(row.signals_json, []),
    explanation: safeParse(row.explanation, null),
  };
}

// ─── GET /history ────────────────────────────────────────────────────────────

router.get('/history', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const rowsResult = await db.execute({
      sql: 'SELECT * FROM scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      args: [req.user.id]
    });
    const rows = rowsResult.rows;

    res.json(rows.map(hydrateScan));
  } catch (err) {
    console.error('[Scans] History error:', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// ─── GET /:id ────────────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const rowResult = await db.execute({
      sql: 'SELECT * FROM scans WHERE id = ?',
      args: [req.params.id]
    });
    const row = rowResult.rows[0];

    if (!row) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json(hydrateScan(row));
  } catch (err) {
    console.error('[Scans] Get error:', err);
    res.status(500).json({ error: 'Failed to load scan' });
  }
});

module.exports = router;
