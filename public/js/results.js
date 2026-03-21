/* ───────────────────────────────────────────────────
   results.js — Scan result page logic (scan.html)
   ─────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('loaded');
  initNav();

  var params = new URLSearchParams(window.location.search);
  var scanId = params.get('id');
  if (!scanId) {
    showErrorState('No scan ID provided.');
    return;
  }
  loadScan(scanId);
});

async function loadScan(scanId) {
  try {
    var res = await fetch('/api/scans/' + scanId);
    if (res.status === 404) {
      showErrorState('Scan not found.');
      return;
    }
    if (!res.ok) {
      showErrorState('Failed to load scan.');
      return;
    }
    var scan = await res.json();
    renderScan(scan);
  } catch (e) {
    showErrorState('Network error. Please try again.');
  }
}

function showErrorState(msg) {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('errorMsg').textContent = msg;
  document.getElementById('errorState').classList.remove('hidden');
}

function renderScan(scan) {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('resultsContainer').classList.remove('hidden');

  /* ── Verdict banner ──────────────────────────────── */
  var colorClass = verdictColorClass(scan.verdict);
  var banner = document.getElementById('verdictBanner');
  banner.className = 'verdict-banner ' + colorClass;

  var title = document.getElementById('verdictTitle');
  title.className = 'verdict-title ' + colorClass;
  title.textContent = verdictLabel(scan.verdict);

  document.getElementById('verdictSummary').textContent = scan.summary || '';

  var confNum = document.getElementById('confidenceNumber');
  confNum.className = 'confidence-number ' + colorClass;
  confNum.textContent = scan.confidence + '%';

  /* ── Metadata ────────────────────────────────────── */
  document.getElementById('scanDate').textContent = formatDate(scan.created_at);
  var mt = scan.media_type || 'image';
  document.getElementById('mediaType').textContent = mt.charAt(0).toUpperCase() + mt.slice(1);

  if (scan.suspected_model) {
    document.getElementById('suspectedModel').textContent = scan.suspected_model;
  } else {
    document.getElementById('suspectedModelWrap').style.display = 'none';
  }

  /* ── Signal cards ────────────────────────────────── */
  var grid = document.getElementById('signalsGrid');
  grid.innerHTML = '';
  var signals = scan.signals || [];

  if (signals.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-dim);font-size:13px;grid-column:1/-1">No signals recorded.</p>';
  } else {
    signals.forEach(function (signal) {
      var cls = severityColorClass(signal.severity);
      var icon = severityIcon(signal.severity);
      var card = document.createElement('div');
      card.className = 'signal-card ' + cls;
      card.innerHTML =
        '<div class="signal-name">' +
          '<span>' + icon + '</span>' +
          '<span>' + escapeHtml(signal.name) + '</span>' +
          '<span class="badge ' + cls + '">' + (signal.severity || 'INFO') + '</span>' +
        '</div>' +
        '<div class="signal-desc">' + escapeHtml(signal.technical_description || '') + '</div>';
      grid.appendChild(card);
    });
  }

  /* ── Detection layers ─────────────────────────────── */
  renderDetectionLayers(scan);

  /* ── Education sections ──────────────────────────── */
  var exp = scan.explanation || {};
  document.getElementById('howDetected').textContent = exp.how_detected || '';
  document.getElementById('whatToLookFor').textContent = exp.what_to_look_for || '';
  document.getElementById('technologyNote').textContent = exp.technology_note || '';

  /* ── Collapsibles ────────────────────────────────── */
  initCollapsibles();

  /* ── Copy Report ─────────────────────────────────── */
  document.getElementById('copyReportBtn').addEventListener('click', function () {
    var signalLines = signals.map(function (s) {
      return '  [' + s.severity + '] ' + s.name + ': ' + (s.technical_description || '');
    }).join('\n');
    var report = [
      'VERITASAI FORENSIC REPORT',
      '='.repeat(30),
      'Verdict:    ' + scan.verdict,
      'Confidence: ' + scan.confidence + '%',
      'Date:       ' + formatDate(scan.created_at),
      '',
      'SUMMARY:',
      scan.summary || '',
      '',
      'FORENSIC SIGNALS:',
      signalLines,
      '',
      'HOW DETECTED:',
      exp.how_detected || '',
      '',
      'WHAT TO LOOK FOR:',
      exp.what_to_look_for || '',
      '',
      'ABOUT THE TECHNOLOGY:',
      exp.technology_note || ''
    ].join('\n');
    navigator.clipboard.writeText(report).then(function () {
      var btn = document.getElementById('copyReportBtn');
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = 'Copy Report'; }, 2000);
    });
  });

  /* ── Share Link ──────────────────────────────────── */
  document.getElementById('shareBtn').addEventListener('click', function () {
    navigator.clipboard.writeText(window.location.href).then(function () {
      var btn = document.getElementById('shareBtn');
      btn.textContent = 'Link Copied!';
      setTimeout(function () { btn.textContent = 'Share Link'; }, 2000);
    });
  });

  /* ── Download PDF Evidence Report ───────────────── */
  document.getElementById('downloadPdfBtn').addEventListener('click', function () {
    var btn = document.getElementById('downloadPdfBtn');
    btn.textContent = 'Generating...';
    btn.disabled = true;

    var a = document.createElement('a');
    a.href = '/api/scans/' + scan.id + '/pdf';
    a.download = 'veritasai-report-' + scan.id + '.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(function () {
      btn.innerHTML = '&#8595; &nbsp;Evidence Report';
      btn.disabled = false;
    }, 3000);
  });
}

function renderDetectionLayers(scan) {
  var existing = document.getElementById('detectionLayersCard');
  if (existing) existing.remove();

  var verdictText = visualVerdictText(scan.verdict);
  var metaVerdict = scan.metaVerdict || scan.meta_verdict || null;
  var freqVerdict = scan.freqVerdict || scan.freq_verdict || null;

  var card = document.createElement('div');
  card.className = 'card';
  card.id = 'detectionLayersCard';
  card.style.marginBottom = '20px';
  card.innerHTML =
    '<div class="panel-header">' +
      '<div class="dot"></div>' +
      '<span>Detection Layers</span>' +
    '</div>' +
    '<div style="padding:20px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px" id="detectionLayersGrid"></div>';

  var results = document.getElementById('resultsContainer');
  var cards = results.querySelectorAll(':scope > .card');
  if (cards.length >= 3) {
    results.insertBefore(card, cards[2]);
  } else {
    results.appendChild(card);
  }

  var grid = document.getElementById('detectionLayersGrid');
  grid.appendChild(buildLayerCard('Visual AI Analysis', verdictText, true));
  grid.appendChild(buildLayerCard('Metadata Forensics', layerVerdictText(metaVerdict), !!metaVerdict));
  grid.appendChild(buildLayerCard('Frequency Analysis', layerVerdictText(freqVerdict), !!freqVerdict));
}

function buildLayerCard(title, verdict, isActive) {
  var color = layerVerdictColor(verdict);
  var wrap = document.createElement('div');
  wrap.className = 'signal-card';
  wrap.style.minHeight = '96px';
  wrap.innerHTML =
    '<div class="signal-name">' + escapeHtml(title) + '</div>' +
    '<div style="font-family:var(--font-mono); font-size:16px; font-weight:700; color:' + color + '; letter-spacing:0.5px">' +
      escapeHtml(verdict) +
    '</div>' +
    '<div style="font-size:11px; color:var(--text-dim); margin-top:6px">' +
      (isActive ? 'Active' : 'Inactive') +
    '</div>';
  return wrap;
}

function visualVerdictText(v) {
  if (v === 'AI_GENERATED') return 'AI DETECTED';
  if (v === 'AUTHENTIC') return 'AUTHENTIC';
  return 'UNCERTAIN';
}

function layerVerdictText(v) {
  if (!v) return 'N/A';
  if (v === 'LIKELY_AI') return 'LIKELY AI';
  if (v === 'LIKELY_AUTHENTIC') return 'LIKELY AUTHENTIC';
  if (v === 'INCONCLUSIVE') return 'INCONCLUSIVE';
  return String(v).replace(/_/g, ' ');
}

function layerVerdictColor(v) {
  if (v === 'AI DETECTED' || v === 'LIKELY AI') return 'var(--red)';
  if (v === 'AUTHENTIC' || v === 'LIKELY AUTHENTIC') return 'var(--green)';
  if (v === 'UNCERTAIN' || v === 'INCONCLUSIVE') return 'var(--amber)';
  return 'var(--text-dim)';
}

/* ── Collapsible toggle ────────────────────────────── */

function initCollapsibles() {
  document.querySelectorAll('.collapsible-header').forEach(function (header) {
    header.addEventListener('click', function () {
      var body = header.nextElementSibling;
      var isOpen = header.classList.contains('open');
      header.classList.toggle('open', !isOpen);
      body.classList.toggle('open', !isOpen);
    });
  });
}

/* ── HTML escape ───────────────────────────────────── */

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
