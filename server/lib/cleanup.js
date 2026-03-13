/**
 * cleanup.js – Automatic removal of stale uploaded files.
 */

const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Delete uploaded files older than MAX_AGE_MS.
 * Safe to call at any time — skips dotfiles and missing directories.
 */
function cleanupOldUploads() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) return;

    const files = fs.readdirSync(UPLOADS_DIR);
    const now = Date.now();
    let deleted = 0;

    files.forEach(function (filename) {
      // Skip dotfiles (.gitkeep, etc.)
      if (filename.startsWith('.')) return;

      var filePath = path.join(UPLOADS_DIR, filename);
      try {
        var stat = fs.statSync(filePath);
        if (stat.isFile() && (now - stat.mtimeMs) > MAX_AGE_MS) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      } catch (e) {
        // Ignore individual file errors
      }
    });

    if (deleted > 0) {
      console.log('[Cleanup] Deleted ' + deleted + ' old upload(s)');
    }
  } catch (err) {
    console.error('[Cleanup] Error:', err.message);
  }
}

module.exports = { cleanupOldUploads };
