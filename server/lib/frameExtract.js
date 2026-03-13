/**
 * frameExtract.js – Extract representative frames from a video using fluent-ffmpeg.
 *
 * Exports:
 *   extractFrames(videoFilePath) → Promise<Array<{ base64: string, mimeType: string }>>
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// Allow deployment platforms (Railway, Render) to provide ffmpeg paths
// via environment variables. Falls back to system PATH if not set.
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH)
}
if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH)
}

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

/**
 * Wrap ffprobe in a Promise.
 */
function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
}

/**
 * Extract a single frame at the given timestamp (in seconds) and save as JPEG.
 *
 * @param {string} videoPath  – path to the source video
 * @param {number} timestamp  – seconds offset into the video
 * @param {string} outputPath – full path for the output JPEG
 * @returns {Promise<void>}
 */
function extractSingleFrame(videoPath, timestamp, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timestamp)
      .frames(1)
      .outputOptions('-q:v', '2')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Extract representative frames from a video file.
 *
 * Strategy:
 *   - If duration >= 3s → extract at 10 %, 50 %, 90 % of duration
 *   - If duration < 3s or probe fails → extract one frame at 0.5 s
 *
 * @param {string} videoFilePath – absolute path to the video file
 * @returns {Promise<Array<{ base64: string, mimeType: string }>>}
 */
async function extractFrames(videoFilePath) {
  let duration = null;
  const tempFrames = [];
  const results = [];

  try {
    // Probe for duration
    try {
      const meta = await probeVideo(videoFilePath);
      duration = meta.format?.duration || null;
    } catch (probeErr) {
      console.warn('[FrameExtract] ffprobe failed, falling back to single frame:', probeErr.message);
    }

    // Decide timestamps
    let timestamps;
    if (duration && duration >= 3) {
      timestamps = [
        +(duration * 0.10).toFixed(2),
        +(duration * 0.50).toFixed(2),
        +(duration * 0.90).toFixed(2),
      ];
    } else {
      timestamps = [0.5];
    }

    // Extract each frame
    for (let i = 0; i < timestamps.length; i++) {
      const outName = `frame_${Date.now()}_${i}.jpg`;
      const outPath = path.join(UPLOAD_DIR, outName);
      tempFrames.push(outPath);

      await extractSingleFrame(videoFilePath, timestamps[i], outPath);

      // Read, convert, store
      const buf = fs.readFileSync(outPath);
      results.push({
        base64: buf.toString('base64'),
        mimeType: 'image/jpeg',
      });
    }

    return results;

  } finally {
    // Always clean up temp frame files
    for (const fp of tempFrames) {
      try {
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch { /* ignore */ }
    }
  }
}

module.exports = { extractFrames };
