/* ───────────────────────────────────────────────────
   history.js — Scan history page logic
   ─────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('loaded');
  initNav();

  if (!isLoggedIn()) {
    window.location.href = '/login.html';
    return;
  }

  loadHistory();
});

async function loadHistory() {
  try {
    var res = await fetch('/api/scans/history', { headers: authHeaders() });
    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }
    if (!res.ok) {
      showHistoryError('Failed to load history.');
      return;
    }
    var scans = await res.json();
    document.getElementById('historyLoading').classList.add('hidden');

    if (scans.length === 0) {
      document.getElementById('historyEmpty').classList.remove('hidden');
      return;
    }

    renderHistory(scans);
  } catch (e) {
    showHistoryError('Network error loading history.');
  }
}

function renderHistory(scans) {
  document.getElementById('historyTableWrap').classList.remove('hidden');
  var tbody = document.getElementById('historyBody');
  tbody.innerHTML = '';

  scans.forEach(function (scan) {
    var colorClass = verdictColorClass(scan.verdict);
    var badgeCls = colorClass === 'verdict-ai' ? 'badge-red'
      : colorClass === 'verdict-authentic' ? 'badge-green' : 'badge-amber';

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="font-size:12px">' + formatDate(scan.created_at) + '</td>' +
      '<td><span class="badge badge-blue">' + (scan.input_type || 'url').toUpperCase() + '</span></td>' +
      '<td><span class="badge ' + badgeCls + '">' + verdictLabel(scan.verdict) + '</span></td>' +
      '<td style="font-family:var(--font-mono);font-size:12px">' + scan.confidence + '%</td>' +
      '<td><a href="/scan.html?id=' + scan.id + '" class="btn-secondary" ' +
        'style="padding:4px 14px;font-size:11px">View</a></td>';
    tbody.appendChild(tr);
  });
}

function showHistoryError(msg) {
  document.getElementById('historyLoading').classList.add('hidden');
  document.getElementById('historyErrorMsg').textContent = msg;
  document.getElementById('historyError').classList.remove('hidden');
}
