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
