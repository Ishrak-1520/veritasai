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
  let total = 0;
  
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

          if (event.type === 'start') {
            total = event.total || 0;
          }
          
          if (event.type === 'progress') {
            completed++;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            document.getElementById('benchmarkProgressFill').style.width = pct + '%';
            document.getElementById('benchmarkProgressLabel').textContent =
              'Analyzed ' + completed + ' of ' + (total || '?') + ' images... ' +
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
    { id: 'metricAuthenticRate', value: metrics.authenticDetectionRate || 0 },
    { id: 'metricFalseAlarm', value: metrics.falseAlarmRate || 0 }
  ];
  
  metrics_display.forEach(m => {
    const el = document.getElementById(m.id);
    if (!el) return;
    const pct = Math.round(m.value * 100);
    el.textContent = pct + '%';
    el.style.color = colorForMetric(pct);
  });
  
  const summary = metrics.authenticSummary || {};
  document.getElementById('authTotalValue').textContent = summary.totalAuthentic || 0;
  document.getElementById('authCorrectValue').textContent = summary.correctlyAuthentic || 0;
  document.getElementById('authFalseAlarmsValue').textContent = summary.falseAlarms || 0;
  
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';
  results.forEach(r => {
    const correct = r.correct;
    const uncertain = r.verdict === 'UNCERTAIN';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-size:12px">${r.label || r.image_id || r.id}</td>
      <td style="font-size:11px; color:var(--text-faint)">${r.source || ''}</td>
      <td><span class="badge ${r.ground_truth === 'AUTHENTIC' ? 'badge-green' : 'badge-amber'}">
        ${r.ground_truth === 'AUTHENTIC' ? 'Authentic' : 'Ambiguous'}
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
