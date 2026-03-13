/* ───────────────────────────────────────────────────
   utils.js — Global utility functions for VeritasAI
   No exports — plain global scope (no ES modules)
   ─────────────────────────────────────────────────── */

/* ── Auth helpers ──────────────────────────────────── */

function getToken() {
  return localStorage.getItem('veritasai_token');
}

function getUserId() {
  return localStorage.getItem('veritasai_userid');
}

function authHeaders() {
  var token = getToken();
  if (token) return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  return { 'Content-Type': 'application/json' };
}

function uploadAuthHeaders() {
  var token = getToken();
  if (token) return { 'Authorization': 'Bearer ' + token };
  return {};
}

function isLoggedIn() {
  return !!getToken();
}

function saveAuth(token, userId) {
  localStorage.setItem('veritasai_token', token);
  localStorage.setItem('veritasai_userid', String(userId));
}

function clearAuth() {
  localStorage.removeItem('veritasai_token');
  localStorage.removeItem('veritasai_userid');
}

/* ── Formatting helpers ────────────────────────────── */

function formatDate(isoString) {
  var d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/* ── Verdict helpers ───────────────────────────────── */

function verdictColorClass(verdict) {
  if (verdict === 'AI_GENERATED') return 'verdict-ai';
  if (verdict === 'AUTHENTIC') return 'verdict-authentic';
  return 'verdict-uncertain';
}

function verdictLabel(verdict) {
  if (verdict === 'AI_GENERATED') return '\u26A0 AI-Generated';
  if (verdict === 'AUTHENTIC') return '\u2713 Likely Authentic';
  return '? Inconclusive';
}

/* ── Severity helpers ──────────────────────────────── */

function severityColorClass(severity) {
  if (severity === 'CRITICAL') return 'severity-critical';
  if (severity === 'WARNING') return 'severity-warning';
  if (severity === 'CLEAR') return 'severity-clear';
  return 'severity-note';
}

function severityIcon(severity) {
  if (severity === 'CRITICAL') return '\u26A0';
  if (severity === 'WARNING') return '\u26A1';
  if (severity === 'CLEAR') return '\u2713';
  return '\u2139';
}

/* ── DOM helpers ───────────────────────────────────── */

function showError(elementId, message) {
  var el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideError(elementId) {
  var el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

/* ── Navbar init ───────────────────────────────────── */

function initNav() {
  var loggedIn = isLoggedIn();

  document.querySelectorAll('.nav-authed').forEach(function (el) {
    if (loggedIn) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });

  document.querySelectorAll('.nav-guest').forEach(function (el) {
    if (loggedIn) el.classList.add('hidden');
    else el.classList.remove('hidden');
  });

  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      clearAuth();
      window.location.href = '/index.html';
    });
  }
}
