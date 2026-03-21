/**
 * server/lib/forensicsClient.js
 * Lightweight client for the Python forensics microservice.
 */

const DEFAULT_FORENSICS_URL = 'http://localhost:5001';

async function runForensicsAnalysis(base64, mimeType) {
  const baseUrl = (process.env.FORENSICS_SERVICE_URL || DEFAULT_FORENSICS_URL).replace(/\/+$/, '');
  const url = `${baseUrl}/analyze`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const fetchMod = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
    const response = await fetchMod(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        mediaType: mimeType
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn('[ForensicsClient] Service responded with non-OK status:', response.status, body);
      return null;
    }

    return await response.json();
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown error');
    console.warn('[ForensicsClient] Service unavailable (non-fatal):', reason);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { runForensicsAnalysis };
