/**
 * longcat.js – Client for the Longcat API.
 *
 * Two separate API paths:
 *   - Anthropic format: https://api.longcat.chat/anthropic/v1/messages
 *     → used by generateExplanation() with LongCat-Flash-Chat
 *   - OpenAI format:    https://api.longcat.chat/openai/v1/chat/completions
 *     → used by analyzeImage() with LongCat-Flash-Omni-2603 (vision model)
 *
 * Exports:
 *   analyzeImage(base64Data, mimeType) → forensic JSON report
 *   generateExplanation(forensicJson)  → plain-language explanation JSON
 *   trackTokenUsage(tokensUsed)        → upserts daily token counter
 *   checkTokenBudget()                 → true if under 4.5M daily limit
 */

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { getDb } = require('./db');
const { FORENSIC_PROMPT, EDUCATION_PROMPT } = require('./prompts');

// ─── Endpoint helpers ────────────────────────────────────────────────────────

const ANTHROPIC_URL = () => 'https://api.longcat.chat/anthropic/v1/messages';
const OPENAI_URL    = () => 'https://api.longcat.chat/openai/v1/chat/completions';
const API_KEY       = () => process.env.LONGCAT_API_KEY || '';

// ─── Shared utilities ─────────────────────────────────────────────────────────

function repairJson(text) {
  let cleaned = text.trim();
  
  // Strip markdown fences
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  cleaned = cleaned.trim();
  
  // Find the first { and last } to extract just the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  // Fix single quotes used instead of double quotes for keys
  // Replace 'key': with "key":
  cleaned = cleaned.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');
  
  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix unquoted string values that should be quoted
  // Only fix known string fields
  cleaned = cleaned.replace(
    /("verdict"\s*:\s*)([A-Z_]+)([,}\s])/g, 
    '$1"$2"$3'
  );
  
  return cleaned;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Anthropic-format caller (for text/chat models) ───────────────────────────

/**
 * Call the Longcat Anthropic-compatible endpoint with retry on failure.
 * Used by generateExplanation (LongCat-Flash-Chat).
 *
 * @param {object} body  – full Anthropic messages request body
 * @param {string} label – label for error messages
 * @returns {object}     – parsed JSON from model text response
 */
async function callLongcat(body, label) {
  let lastError;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      let res;
      try {
        res = await fetch(ANTHROPIC_URL(), {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + API_KEY(),
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Longcat API error: ${res.status} ${errorBody}`);
      }

      const data = await res.json();

      if (data.usage) {
        const total = (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
        if (total > 0) {
          try { await trackTokenUsage(total); } catch (e) {
            console.warn(`[Longcat] Token tracking failed: ${e.message}`);
          }
        }
      }

      const textBlock = (data.content || []).find((c) => c.type === 'text');
      if (!textBlock || !textBlock.text) {
        throw new Error('Longcat API returned no text content');
      }

      return JSON.parse(repairJson(textBlock.text));
    } catch (err) {
      lastError = err;
      console.error(`[Longcat] ${label} attempt ${attempt} failed:`, err.message);
      if (attempt < 2) await sleep(2000);
    }
  }

  throw new Error(`[Longcat] ${label} failed after 2 attempts: ${lastError.message}`);
}

// ─── OpenAI-format caller (for vision model) ──────────────────────────────────

/**
 * Call the Longcat OpenAI-compatible endpoint with retry on failure.
 * Used by analyzeImage (LongCat-Flash-Omni-2603).
 *
 * @param {object} body  – full OpenAI chat completions request body
 * @param {string} label – label for error messages
 * @returns {object}     – parsed JSON from model text response
 */
async function callLongcatOpenAI(body, label) {
  let lastError;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      let res;
      try {
        res = await fetch(OPENAI_URL(), {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + API_KEY(),
          },
          body: JSON.stringify(body),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Longcat API error: ${res.status} ${errorBody}`);
      }

      const data = await res.json();

      if (data.usage) {
        const total = (data.usage.prompt_tokens || 0) + (data.usage.completion_tokens || 0);
        if (total > 0) {
          try { await trackTokenUsage(total); } catch (e) {
            console.warn(`[Longcat] Token tracking failed: ${e.message}`);
          }
        }
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Longcat OpenAI API returned no content');
      }

      const cleaned = repairJson(content);
      
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        console.error(`[Longcat] JSON repair failed for ${label}:`, e.message);
        // If we still can't parse, return a fallback safety object so the app doesn't crash
        return {
          verdict: "UNCERTAIN",
          confidence: 0,
          summary: "Analysis failed due to malformed AI response.",
          signals: []
        };
      }
    } catch (err) {
      lastError = err;
      console.error(`[Longcat] ${label} attempt ${attempt} failed:`, err.message);
      if (attempt < 2) await sleep(2000);
    }
  }

  throw new Error(`[Longcat] ${label} failed after 2 attempts: ${lastError.message}`);
}

// ─── Exported API functions ───────────────────────────────────────────────────

/**
 * Analyze an image for AI-generation artifacts.
 * Uses LongCat-Flash-Omni-2603 via the OpenAI-format endpoint.
 *
 * @param {string} base64Data – base64-encoded image (no data URI prefix)
 * @param {string} mimeType   – e.g. "image/jpeg"
 * @returns {Promise<object>}  – forensic JSON report
 */
async function analyzeImage(base64Data, mimeType) {
  const body = {
    model: 'LongCat-Flash-Omni-2603',
    stream: false,
    max_tokens: 2000,
    output_modalities: ["text"],
    messages: [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: FORENSIC_PROMPT
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_image',
            input_image: {
              type: 'base64',
              data: [base64Data]
            }
          },
          {
            type: 'text',
            text: 'Analyze this image and return the forensic JSON report.'
          }
        ]
      }
    ]
  };

  return callLongcatOpenAI(body, 'analyzeImage');
}

/**
 * Generate a plain-language explanation from a forensic JSON report.
 * Uses LongCat-Flash-Chat via the Anthropic-format endpoint.
 *
 * @param {object} forensicJson – the forensic report object from analyzeImage
 * @returns {Promise<object>}   – education JSON
 */
async function generateExplanation(forensicJson) {
  const body = {
    model: 'LongCat-Flash-Chat',
    max_tokens: 1000,
    system: EDUCATION_PROMPT,
    messages: [
      {
        role: 'user',
        content: JSON.stringify(forensicJson),
      },
    ],
  };

  return callLongcat(body, 'generateExplanation');
}

/**
 * Upsert daily token usage in the database.
 *
 * @param {number} tokensUsed – tokens to add to today's total
 * @returns {number}          – updated daily total
 */
async function trackTokenUsage(tokensUsed) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  db.prepare(
    `INSERT INTO token_usage (date, tokens_used) VALUES (?, ?)
     ON CONFLICT(date) DO UPDATE SET tokens_used = tokens_used + excluded.tokens_used`
  ).run(today, tokensUsed);

  const row = db.prepare('SELECT tokens_used FROM token_usage WHERE date = ?').get(today);
  return row ? row.tokens_used : tokensUsed;
}

/**
 * Check whether we are under the daily token budget (4,500,000 tokens).
 *
 * @returns {Promise<boolean>} – true if budget is available
 */
async function checkTokenBudget() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const row = db.prepare('SELECT tokens_used FROM token_usage WHERE date = ?').get(today);
  if (!row) return true;
  return row.tokens_used < 4500000;
}

// ─── Module exports ───────────────────────────────────────────────────────────

module.exports = { analyzeImage, generateExplanation, trackTokenUsage, checkTokenBudget };

// ─── Self-test (run with: node server/lib/longcat.js) ────────────────────────

if (require.main === module) {
  (async () => {
    console.log('--- Longcat dual-API self-test ---\n');

    try {
      console.log('[Test] Fetching test image from picsum.photos...');
      const imgRes = await fetch('https://picsum.photos/id/237/400/400.jpg');
      if (!imgRes.ok) throw new Error('Failed to fetch test image');
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const base64 = buffer.toString('base64');
      console.log(`[Test] Image fetched: ${buffer.length} bytes\n`);

      const budgetOk = await checkTokenBudget();
      console.log(`[Test] Token budget available: ${budgetOk}\n`);

      console.log('[Test] Calling analyzeImage (OpenAI format → LongCat-Flash-Omni-2603)...');
      const forensic = await analyzeImage(base64, 'image/jpeg');
      console.log('[Test] verdict:         ', forensic.verdict);
      console.log('[Test] confidence:      ', forensic.confidence);
      console.log('[Test] suspected_model: ', forensic.suspected_model);
      console.log('[Test] signals count:   ', forensic.signals?.length);
      console.log('[Test] summary:         ', forensic.summary);
      console.log();

      console.log('[Test] Calling generateExplanation (Anthropic format → LongCat-Flash-Chat)...');
      const explanation = await generateExplanation(forensic);
      console.log('[Test] how_detected:    ', explanation.how_detected?.substring(0, 150) + '...');
      console.log('[Test] what_to_look_for:', explanation.what_to_look_for?.substring(0, 150) + '...');
      console.log('[Test] technology_note: ', explanation.technology_note?.substring(0, 150) + '...');
      console.log();

      console.log('[Test] All tests passed!');
    } catch (err) {
      console.error('[Test] FAILED:', err.message);
      process.exit(1);
    }
  })();
}
