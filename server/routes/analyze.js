/**
 * routes/analyze.js – Core detection pipeline.
 *
 * POST /api/analyze
 *   body: { type: 'url'|'upload', url?: string, tempFileId?: string }
 *
 * Flow: budget check → validate → load media → (optional frame extraction) →
 *       forensic analysis → education layer → save → respond.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { optionalAuth } = require('../lib/auth');
const { analyzeImage, generateExplanation, checkTokenBudget } = require('../lib/longcat');
const { extractFrames } = require('../lib/frameExtract');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * SSRF protection — reject private/internal addresses.
 */
function validateUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  // Only allow http(s) — block file://, ftp://, javascript://, etc.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const h = parsed.hostname;

  // Reject very short hostnames (catches 'a.b' type attacks)
  if (h.length < 4) return false;

  // Block known internal hostnames
  const blocked = ['localhost', '0.0.0.0', '::1'];
  for (const b of blocked) {
    if (h === b) return false;
  }

  // If hostname is a bare IP address, check for private ranges
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h)) {
    if (h.startsWith('10.')) return false;
    if (h.startsWith('192.168.')) return false;
    if (h.startsWith('127.')) return false;
    if (h.startsWith('169.254.')) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return false;
  }

  // Also block hostnames that contain these patterns (e.g. 127.0.0.1.nip.io)
  const blockedPatterns = ['127.', '10.', '192.168.', '169.254.'];
  for (const bp of blockedPatterns) {
    if (h.startsWith(bp)) return false;
  }

  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return false;

  return true;
}

/**
 * Severity ranking for signal deduplication.
 */
const SEVERITY_RANK = { CRITICAL: 4, WARNING: 3, NOTE: 2, CLEAR: 1 };

/**
 * Safely delete a file if it exists.
 */
function safeDelete(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch { /* ignore */ }
}

// ─── POST /analyze ──────────────────────────────────────────────────────────

router.post('/', optionalAuth, async (req, res) => {
  const filesToCleanup = [];

  try {
    // ── STEP 1: Budget check ────────────────────────────────────────────
    const budgetOk = await checkTokenBudget();
    if (!budgetOk) {
      return res.status(429).json({ error: 'Daily analysis limit reached. Resets at midnight.' });
    }

    // ── STEP 2: Input validation ────────────────────────────────────────
    const { type } = req.body;
    let { url, tempFileId } = req.body;

    if (type !== 'url' && type !== 'upload') {
      return res.status(400).json({ error: 'type must be url or upload' });
    }
    if (type === 'url' && (!url || !url.trim())) {
      return res.status(400).json({ error: 'url is required' });
    }
    if (type === 'upload' && !tempFileId) {
      return res.status(400).json({ error: 'tempFileId is required' });
    }

    // ── STEP 2.5: Input sanitization ────────────────────────────────────
    if (type === 'url') {
      url = url.trim();
      if (url.length > 2000) {
        return res.status(400).json({ error: 'URL too long' });
      }
    }
    if (type === 'upload') {
      tempFileId = String(tempFileId).trim();
      if (!/^[a-zA-Z0-9_\-.]+$/.test(tempFileId)) {
        return res.status(400).json({ error: 'Invalid file ID' });
      }
    }

    // ── STEP 3: SSRF protection ─────────────────────────────────────────
    if (type === 'url' && !validateUrl(url)) {
      return res.status(400).json({ error: 'URL not allowed' });
    }

    // ── STEP 4: Media loading ───────────────────────────────────────────
    let base64, mimeType, mediaType, inputValue;
    let tempFilePath = null;

    if (type === 'url') {
      const fetchMod = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      let response;
      try {
        response = await fetchMod(url, { signal: controller.signal });
        clearTimeout(timeout);
      } catch (err) {
        clearTimeout(timeout);
        console.error('[Analyze] URL fetch failed:', err.message);
        return res.status(400).json({ error: 'Could not fetch URL' });
      }

      if (!response.ok) {
        return res.status(400).json({ error: 'Could not fetch URL' });
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('image') && !contentType.includes('video')) {
        return res.status(400).json({ error: 'URL must point to an image or video file' });
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      base64 = buffer.toString('base64');
      mimeType = contentType.split(';')[0].trim();
      mediaType = contentType.includes('video') ? 'video' : 'image';
      inputValue = url;

      // If video from URL, save to temp file for frame extraction
      if (mediaType === 'video') {
        const tmpName = Date.now() + '_urlvideo.tmp';
        tempFilePath = path.join(UPLOAD_DIR, tmpName);
        fs.writeFileSync(tempFilePath, buffer);
        filesToCleanup.push(tempFilePath);
      }

    } else {
      // type === 'upload'
      const filePath = path.join(UPLOAD_DIR, tempFileId);
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ error: 'Uploaded file not found' });
      }

      tempFilePath = filePath;
      filesToCleanup.push(tempFilePath);

      const buffer = fs.readFileSync(filePath);

      const { fileTypeFromBuffer } = await import('file-type');
      const ft = await fileTypeFromBuffer(buffer);
      if (!ft) {
        return res.status(400).json({ error: 'Cannot determine file type' });
      }

      mimeType = ft.mime;
      mediaType = mimeType.startsWith('video/') ? 'video' : 'image';
      base64 = buffer.toString('base64');
      inputValue = tempFileId;
    }

    // ── STEP 5: Frame extraction (video only) ───────────────────────────
    let frames = null;

    if (mediaType === 'video') {
      try {
        frames = await extractFrames(tempFilePath);
      } catch (err) {
        console.error('[Analyze] Frame extraction failed:', err.message);
        return res.status(500).json({ error: 'Video frame extraction failed' });
      }
    }

    // ── STEP 6: Detection ───────────────────────────────────────────────
    let forensicResult;

    if (mediaType === 'image') {
      forensicResult = await analyzeImage(base64, mimeType);

    } else {
      // Video — analyze extracted frames
      const frameResults = await Promise.all(
        frames.map((f) => analyzeImage(f.base64, f.mimeType))
      );

      // Aggregate verdict
      const aiFrames = frameResults.filter((r) => r.verdict === 'AI_GENERATED');
      const authFrames = frameResults.filter((r) => r.verdict === 'AUTHENTIC');

      let verdict, confidence;
      if (aiFrames.length > 0) {
        verdict = 'AI_GENERATED';
        confidence = Math.max(...aiFrames.map((r) => r.confidence));
      } else if (authFrames.length === frameResults.length) {
        verdict = 'AUTHENTIC';
        confidence = Math.round(
          frameResults.reduce((s, r) => s + r.confidence, 0) / frameResults.length
        );
      } else {
        verdict = 'UNCERTAIN';
        confidence = Math.round(
          frameResults.reduce((s, r) => s + r.confidence, 0) / frameResults.length
        );
      }

      // Merge & deduplicate signals (keep highest severity per name, top 8)
      const signalMap = new Map();
      for (const fr of frameResults) {
        for (const sig of fr.signals || []) {
          const existing = signalMap.get(sig.name);
          if (!existing || (SEVERITY_RANK[sig.severity] || 0) > (SEVERITY_RANK[existing.severity] || 0)) {
            signalMap.set(sig.name, sig);
          }
        }
      }

      const mergedSignals = [...signalMap.values()]
        .sort((a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0))
        .slice(0, 8);

      // Pick model / technique from the AI_GENERATED frame with highest confidence
      const bestAI = aiFrames.length
        ? aiFrames.reduce((best, r) => (r.confidence > best.confidence ? r : best))
        : null;

      forensicResult = {
        verdict,
        confidence,
        summary: `Video analysis based on ${frames.length} extracted frames.`,
        suspected_model: bestAI?.suspected_model || null,
        generation_technique: bestAI?.generation_technique || null,
        signals: mergedSignals,
      };
    }

    // ── STEP 7: Education layer ─────────────────────────────────────────
    const explanation = await generateExplanation(forensicResult);

    // ── STEP 8: Save to database ────────────────────────────────────────
    const { nanoid } = await import('nanoid');
    const scanId = nanoid(12);
    const { getDb } = require('../lib/db');
    const db = getDb();

    db.prepare(
      `INSERT INTO scans
       (id, user_id, input_type, input_value, media_type, verdict, confidence,
        signals_json, explanation, suspected_model)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      scanId,
      req.user?.id || null,
      type,
      inputValue,
      mediaType,
      forensicResult.verdict,
      forensicResult.confidence,
      JSON.stringify(forensicResult.signals),
      JSON.stringify(explanation),
      forensicResult.suspected_model || null
    );

    // ── STEP 9: Respond ─────────────────────────────────────────────────
    res.json({
      scanId,
      verdict: forensicResult.verdict,
      confidence: forensicResult.confidence,
      summary: forensicResult.summary,
      suspected_model: forensicResult.suspected_model,
      signals: forensicResult.signals,
      explanation,
    });

  } catch (err) {
    console.error('[Analyze] FULL ERROR:', err.message);
    console.error('[Analyze] STACK:', err.stack);
    res.status(500).json({ error: 'Analysis failed. Please try again.' });
  } finally {
    // ── Cleanup ───────────────────────────────────────────────────────
    for (const fp of filesToCleanup) {
      safeDelete(fp);
    }
  }
});

module.exports = router;
