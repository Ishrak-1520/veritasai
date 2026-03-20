const router = require('express').Router();
const { getBenchmarkResults, runBenchmark, clearBenchmarkCache, calculateMetrics } = require('../lib/benchmark');
const { testImages } = require('../lib/benchmarkData');

// GET /benchmark/results
router.get('/results', async (req, res) => {
  try {
    const results = await getBenchmarkResults();
    if (!results || results.length === 0) {
      return res.json({ status: 'not_run', results: [] });
    }
    
    const metrics = calculateMetrics(results);
    const ranAt = results[0].ran_at;
    
    res.json({
      status: 'complete',
      metrics,
      results: metrics.results,
      testImages,
      ranAt
    });
  } catch (err) {
    console.error('[Benchmark] Error fetching results:', err.message);
    res.status(500).json({ error: 'Failed to fetch benchmark results' });
  }
});

// GET /benchmark/run (SSE endpoint)
router.get('/run', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ type: 'start', total: testImages.length });

  try {
    const finalResults = await runBenchmark((imageId, status, verdict, confidence) => {
      sendEvent({ type: 'progress', imageId, status, verdict, confidence });
    });

    const metrics = calculateMetrics(finalResults);
    sendEvent({ type: 'complete', metrics, results: metrics.results });
    res.end();
  } catch (err) {
    console.error('[Benchmark] Run error:', err.message);
    sendEvent({ type: 'error', message: err.message });
    res.end();
  }
});

// DELETE /benchmark/cache
router.delete('/cache', async (req, res) => {
  const secret = req.headers['x-admin-key'];
  if (secret !== (process.env.ADMIN_KEY || 'veritasai-admin')) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    await clearBenchmarkCache();
    res.json({ cleared: true });
  } catch (err) {
    console.error('[Benchmark] Error clearing cache:', err.message);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

module.exports = router;
