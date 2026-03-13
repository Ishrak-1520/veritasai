/**
 * routes/upload.js – File upload endpoint with multer + magic-byte verification.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Multer configuration ────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    cb(null, Date.now() + '_' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are accepted'));
    }
  },
});

// ─── POST /upload ────────────────────────────────────────────────────────────

router.post('/', (req, res) => {
  upload.single('file')(req, res, async (multerErr) => {
    if (multerErr) {
      if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected file field. Please use the standard upload form.' });
      }
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
      }
      return res.status(400).json({ error: multerErr.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const savedPath = req.file.path;

    try {
      // Filename sanitization — reject path traversal attempts
      if (req.file.filename.includes('..') || req.file.filename.includes('/') || req.file.filename.includes('\\')) {
        fs.unlinkSync(savedPath);
        return res.status(400).json({ error: 'Invalid filename' });
      }

      // Dynamic import – file-type is ESM-only in v19+
      const { fileTypeFromFile } = await import('file-type');
      const type = await fileTypeFromFile(savedPath);

      if (
        !type ||
        (!type.mime.startsWith('image/') && !type.mime.startsWith('video/'))
      ) {
        // Magic bytes don't match an image or video — remove the file
        fs.unlinkSync(savedPath);
        return res.status(400).json({ error: 'File type not allowed. Only images and videos are accepted.' });
      }

      res.json({
        tempFileId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      });
    } catch (err) {
      // Clean up the file on unexpected errors
      if (fs.existsSync(savedPath)) {
        try { fs.unlinkSync(savedPath); } catch { /* ignore */ }
      }
      console.error('[Upload] Error:', err);
      res.status(500).json({ error: 'Upload processing failed' });
    }
  });
});

module.exports = router;
