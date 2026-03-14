/**
 * routes/auth.js – Registration, login, and current-user routes.
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

/**
 * Generate a signed JWT for a given user id.
 */
function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ─── POST /register ─────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const db = getDb();
    const existingResult = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email]
    });
    const existing = existingResult.rows[0];

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await db.execute({
      sql: 'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      args: [email, passwordHash]
    });

    const token = generateToken(result.lastInsertRowid.toString());

    res.status(201).json({ token, userId: result.lastInsertRowid.toString() });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Dummy hash for timing-attack prevention — bcrypt.compare always runs
const DUMMY_HASH = '$2b$12$invalidhashfortimingatack000000000000000000000000';

// ─── POST /login ─────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    const user = userResult.rows[0];

    // Always compare to prevent timing attacks — even if user doesn't exist
    const hashToCheck = user ? user.password_hash : DUMMY_HASH;
    const valid = await bcrypt.compare(password, hashToCheck);

    if (!user || !valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({ token, userId: user.id });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── GET /me ─────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const userResult = await db.execute({
      sql: 'SELECT id, email, created_at FROM users WHERE id = ?',
      args: [req.user.id]
    });
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('[Auth] /me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
