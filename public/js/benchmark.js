document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('loaded');
  initNav();
  loadExistingResults();
  
  document.getElementById('runBenchmarkBtn')
    .addEventListener('click', startBenchmark);
});

async function loadExistingResults() {
  try {
    const res = await fetch('/api/benchmark/results');
    const data = await res.json();
    if (data.status === 'not_run') {
      document.getElementById('benchmarkStatus').textContent = 
        'Benchmark has not been run yet. Click Run to start.';
      return;
    }
    renderResults(data.metrics, data.results, data.testImages, data.ranAt);
  } catch (e) {
    document.getElementById('benchmarkStatus').textContent = 
      'Failed to load results.';
  }
}

async function startBenchmark() {
  const btn = document.getElementById('runBenchmarkBtn');
  btn.disabled = true;
  btn.textContent = 'Running...';
  document.getElementById('benchmarkProgress').style.display = 'block';
  document.getElementById('benchmarkStatus').textContent = 
    'Running benchmark — this may take 5-10 minutes...';
  
  let completed = 0;
  const total = 20;
  
  try {
    const response = await fetch('/api/benchmark/run');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const messages = buffer.split('\n\n');
      buffer = messages.pop();
      
      for (const message of messages) {
        const line = message.replace(/^data:\s*/, '').trim();
        if (!line) continue;
        try {
          const event = JSON.parse(line);
          
          if (event.type === 'progress') {
            completed++;
            const pct = Math.round((completed / total) * 100);
            document.getElementById('benchmarkProgressFill').style.width = pct + '%';
            document.getElementById('benchmarkProgressLabel').textContent =
              'Analyzed ' + completed + ' of ' + total + ' images... ' +
              (event.status === 'cached' ? '(cached)' : '(' + event.verdict + ')');
          }
          
          if (event.type === 'complete') {
            renderResults(event.metrics, event.results, null, new Date().toISOString());
            btn.textContent = 'Re-run Benchmark';
            btn.disabled = false;
            document.getElementById('benchmarkProgress').style.display = 'none';
          }
        } catch (e) {
          continue;
        }
      }
    }
  } catch (err) {
    document.getElementById('benchmarkStatus').textContent = 'Error: ' + err.message;
    btn.disabled = false;
    btn.textContent = 'Run Benchmark';
  }
}

function renderResults(metrics, results, testImages, ranAt) {
  document.getElementById('benchmarkStatus').textContent = 
    'Benchmark complete — ' + results.length + ' images analyzed';
  if (ranAt) {
    document.getElementById('benchmarkLastRun').textContent = 
      'Last run: ' + formatDate(ranAt);
  }
  
  document.getElementById('metricsSection').style.display = 'block';
  
  function colorForMetric(pct) {
    if (pct >= 80) return 'var(--green)';
    if (pct >= 60) return 'var(--amber)';
    return 'var(--red)';
  }
  
  const metrics_display = [
    { id: 'metricAccuracy',  value: metrics.accuracy,  label: 'accuracy'  },
    { id: 'metricPrecision', value: metrics.precision, label: 'precision' },
    { id: 'metricRecall',    value: metrics.recall,    label: 'recall'    },
    { id: 'metricF1',        value: metrics.f1,        label: 'f1'        }
  ];
  
  metrics_display.forEach(m => {
    const el = document.getElementById(m.id);
    if (!el) return;
    const pct = Math.round(m.value * 100);
    el.textContent = pct + '%';
    el.style.color = colorForMetric(pct);
  });
  
  document.getElementById('cmTP').textContent = metrics.confusionMatrix.TP;
  document.getElementById('cmFP').textContent = metrics.confusionMatrix.FP;
  document.getElementById('cmTN').textContent = metrics.confusionMatrix.TN;
  document.getElementById('cmFN').textContent = metrics.confusionMatrix.FN;
  document.getElementById('fprValue').textContent = 
    Math.round(metrics.falsePositiveRate * 100) + '%';
  document.getElementById('fnrValue').textContent = 
    Math.round(metrics.falseNegativeRate * 100) + '%';
  
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';
  results.forEach(r => {
    const correct = r.correct;
    const uncertain = r.verdict === 'UNCERTAIN';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-size:12px">${r.label || r.image_id || r.id}</td>
      <td style="font-size:11px; color:var(--text-faint)">${r.source || ''}</td>
      <td><span class="badge ${r.ground_truth === 'AI_GENERATED' ? 'badge-red' : 'badge-green'}">
        ${r.ground_truth === 'AI_GENERATED' ? 'AI' : 'Authentic'}
      </span></td>
      <td><span class="badge ${
        r.verdict === 'AI_GENERATED' ? 'badge-red' : 
        r.verdict === 'AUTHENTIC' ? 'badge-green' : 'badge-amber'
      }">${r.verdict === 'AI_GENERATED' ? 'AI' : r.verdict === 'AUTHENTIC' ? 'Authentic' : '?'}</span></td>
      <td style="font-family:var(--font-mono); font-size:12px">${r.confidence}%</td>
      <td><span style="font-size:12px">${
        r.verdict === 'ERROR' ? '⚠ Error' :
        uncertain ? '~ Uncertain' :
        correct ? '✓ Correct' : '✗ Wrong'
      }</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric', 
                    hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}
