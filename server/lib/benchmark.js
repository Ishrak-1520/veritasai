const { testImages } = require('./benchmarkData');
const { analyzeImageWithVerification } = require('./longcat');
const { calibrateResult } = require('../routes/analyze');
const { getDb } = require('./db');
const fetch = (...a) => import('node-fetch').then(({default:f})=>f(...a));

/**
 * Fetch existing benchmark results from the database.
 */
async function getBenchmarkResults() {
  const db = getDb();
  const res = await db.execute('SELECT * FROM benchmark_results');
  return res.rows;
}

/**
 * Clear the benchmark cache (admin operation).
 */
async function clearBenchmarkCache() {
  const db = getDb();
  await db.execute('DELETE FROM benchmark_results');
}

/**
 * Run the benchmark suite on all test images.
 * @param {Function} onProgress Callback: (imageId, status, verdict, confidence)
 */
async function runBenchmark(onProgress) {
  const db = getDb();
  
  // Clear cached failed downloads/analyses so the benchmark can be re-run.
  try {
    await db.execute({
      sql: 'DELETE FROM benchmark_results WHERE verdict = ? OR verdict IS NULL',
      args: ['ERROR']
    });
    console.log('[Benchmark] Cleared ERROR results from cache');
  } catch (e) {
    console.warn('[Benchmark] Could not clear cache:', e.message);
  }

  const resultsTable = await getBenchmarkResults();
  
  // Create a quick lookup for cached results
  const cached = {};
  for (const row of resultsTable) {
    cached[row.image_id] = row;
  }

  const finalResults = [];

  for (const image of testImages) {
    if (cached[image.id]) {
      // Use cached result
      const row = cached[image.id];
      onProgress(image.id, 'cached', row.verdict, row.confidence);
      finalResults.push({
        id: image.id,
        ground_truth: image.groundTruth,
        verdict: row.verdict,
        confidence: row.confidence,
        label: image.label,
        source: image.source
      });
      continue;
    }

    // Run new analysis
    let verdict = 'ERROR';
    let confidence = 0;

    try {
      const response = await fetch(image.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VeritasAI-Research/1.0)',
          'Accept': 'image/webp,image/jpeg,image/png,image/*'
        }
      });
      if (!response.ok) throw new Error('Failed to download image.');
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const base64 = buffer.toString('base64');
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      let result = await analyzeImageWithVerification(base64, contentType);
      result = calibrateResult(result);
      
      verdict = result.verdict;
      confidence = result.confidence || 0;
      
    } catch (err) {
      console.error(`[Benchmark] Failed to analyze ${image.id}:`, err.message);
      onProgress(image.id, 'error', 'ERROR', 0);
    }

    // Store in DB
    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO benchmark_results (image_id, ground_truth, verdict, confidence) 
              VALUES (?, ?, ?, ?)`,
        args: [image.id, image.groundTruth, verdict, confidence]
      });
      if (verdict !== 'ERROR') {
        onProgress(image.id, 'complete', verdict, confidence);
      }
    } catch (dbErr) {
      console.error(`[Benchmark] Failed to cache result for ${image.id}:`, dbErr.message);
    }

    finalResults.push({
      id: image.id,
      ground_truth: image.groundTruth,
      verdict,
      confidence,
      label: image.label,
      source: image.source
    });
  }

  return finalResults;
}

/**
 * Calculate standard detection metrics.
 * 
 * For binary classification (AI_GENERATED = positive class):
 * - TP: ground_truth=AI_GENERATED AND verdict=AI_GENERATED
 * - FP: ground_truth=AUTHENTIC AND verdict=AI_GENERATED
 * - TN: ground_truth=AUTHENTIC AND verdict=AUTHENTIC or UNCERTAIN
 * - FN: ground_truth=AI_GENERATED AND verdict=AUTHENTIC or UNCERTAIN
 */
function calculateMetrics(results) {
  let TP = 0, FP = 0, TN = 0, FN = 0;

  const perImageResults = results.map(r => {
    // Map db row column image_id to id if missing
    r.id = r.id || r.image_id;
    // We treat UNCERTAIN as incorrect for both classes in strictly per-image "correct" definitions
    const correct = r.ground_truth === r.verdict;

    if (r.ground_truth === 'AI_GENERATED') {
      if (r.verdict === 'AI_GENERATED') TP++;
      else FN++; // AUTHENTIC or UNCERTAIN or ERROR
    } else if (r.ground_truth === 'AUTHENTIC') {
      if (r.verdict === 'AI_GENERATED') FP++;
      else TN++; // AUTHENTIC or UNCERTAIN or ERROR
    }

    return {
      ...r,
      correct
    };
  });

  const total = TP + FP + TN + FN;
  const precision = (TP + FP) > 0 ? TP / (TP + FP) : 0;
  const recall = (TP + FN) > 0 ? TP / (TP + FN) : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = total > 0 ? (TP + TN) / total : 0;
  
  const falsePositiveRate = (FP + TN) > 0 ? FP / (FP + TN) : 0;
  const falseNegativeRate = (FN + TP) > 0 ? FN / (FN + TP) : 0;

  return {
    precision: Number(precision.toFixed(3)),
    recall: Number(recall.toFixed(3)),
    f1: Number(f1.toFixed(3)),
    accuracy: Number(accuracy.toFixed(3)),
    falsePositiveRate: Number(falsePositiveRate.toFixed(3)),
    falseNegativeRate: Number(falseNegativeRate.toFixed(3)),
    confusionMatrix: { TP, FP, TN, FN },
    results: perImageResults
  };
}

module.exports = {
  getBenchmarkResults,
  runBenchmark,
  clearBenchmarkCache,
  calculateMetrics
};
