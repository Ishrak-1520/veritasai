require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const { initializeDatabase } = require('./lib/db');
const { cleanupOldUploads } = require('./lib/cleanup');

const analyzeRoutes = require('./routes/analyze');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const scansRoutes = require('./routes/scans');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// JWT_SECRET warning
// ---------------------------------------------------------------------------

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.warn('[WARN] JWT_SECRET is not set or too short! Use at least 32 characters.');
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

// Global limiter — applies to all API routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Analyze limiter — POST /api/analyze only
const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Analysis limit reached. You can run 15 scans per hour.' },
  skip: (req) => {
    // Skip rate limit for authenticated users (they get the global limit instead)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        return true; // valid token — skip this limiter
      } catch {
        return false;
      }
    }
    return false;
  },
});

// Auth limiter — login and register endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Please wait 15 minutes.' },
});

app.use(globalLimiter);

// ---------------------------------------------------------------------------
// Static files — only /public, NOT /uploads
// ---------------------------------------------------------------------------

app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------------------------------------------------------------------------
// Rate limit specific routes BEFORE mounting them
// ---------------------------------------------------------------------------

app.use('/api/analyze', analyzeLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

app.use('/api/analyze', analyzeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/scans', scansRoutes);

// ---------------------------------------------------------------------------
// Budget endpoint (lightweight, no separate route file needed)
// ---------------------------------------------------------------------------

app.get('/api/budget', (req, res) => {
  try {
    const { getDb } = require('./lib/db');
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const row = db.prepare('SELECT tokens_used FROM token_usage WHERE date = ?').get(today);
    const used = row ? row.tokens_used : 0;
    const limit = 4500000;
    res.json({ used, remaining: limit - used, limit });
  } catch (err) {
    res.json({ used: 0, remaining: 4500000, limit: 4500000 });
  }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ---------------------------------------------------------------------------
// SPA fallback – serve index.html for any non-API GET request
// ---------------------------------------------------------------------------

app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// DEBUG ROUTE (Temporary)
// ---------------------------------------------------------------------------

app.get('/api/debug', async (req, res) => {
  const results = {};
  
  // Test 1: DB connection
  try {
    const { getDb } = require('./lib/db');
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM scans').get();
    results.db = { ok: true, scanCount: row.count };
  } catch (err) {
    results.db = { ok: false, error: err.message };
  }
  
  // Test 2: Environment variables present (not their values)
  results.env = {
    LONGCAT_API_KEY: !!process.env.LONGCAT_API_KEY,
    LONGCAT_BASE_URL: !!process.env.LONGCAT_BASE_URL,
    LONGCAT_BASE_URL_OPENAI: !!process.env.LONGCAT_BASE_URL_OPENAI,
    JWT_SECRET: !!process.env.JWT_SECRET,
    FFMPEG_PATH: process.env.FFMPEG_PATH || 'not set',
    FFPROBE_PATH: process.env.FFPROBE_PATH || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set'
  };
  
  // Test 3: Can we reach Longcat API at all
  try {
    const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const apiRes = await fetch(
      (process.env.LONGCAT_BASE_URL_OPENAI || '') + '/v1/chat/completions',
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (process.env.LONGCAT_API_KEY || '')
        },
        body: JSON.stringify({
          model: 'LongCat-Flash-Chat',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say hi' }]
        })
      }
    );
    clearTimeout(timeout);
    results.longcatPing = { ok: apiRes.ok, status: apiRes.status };
  } catch (err) {
    results.longcatPing = { ok: false, error: err.message };
  }

  // Test 4: ffmpeg available
  try {
    const { execSync } = require('child_process');
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    execSync(ffmpegPath + ' -version', { timeout: 5000 });
    results.ffmpeg = { ok: true, path: ffmpegPath };
  } catch (err) {
    results.ffmpeg = { ok: false, error: err.message };
  }

  res.json(results);
});

// ---------------------------------------------------------------------------
// Initialize database & start server
// ---------------------------------------------------------------------------

initializeDatabase();

// Run cleanup once at startup, then every 30 minutes
cleanupOldUploads();
setInterval(cleanupOldUploads, 30 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`VeritasAI server running on port ${PORT}`);
});
