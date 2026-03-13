/* ───────────────────────────────────────────────────
   main.js — Homepage logic (index.html only)
   ─────────────────────────────────────────────────── */

var LOADING_MESSAGES = [
  'Initializing scan...',
  'Analyzing visual artifacts...',
  'Checking facial geometry...',
  'Evaluating lighting consistency...',
  'Running semantic analysis...',
  'Detecting generation signatures...',
  'Generating forensic report...',
  'Preparing educational breakdown...',
  'Still processing, please wait...',
  'Cross-checking results...',
  'Almost done...'
];

var loadingInterval = null;
var selectedFile = null;

document.addEventListener('DOMContentLoaded', function () {
  document.body.classList.add('loaded');
  initNav();
  loadBudget();
  setupTabs();
  setupUrlInput();
  setupUpload();
  setupAnalyzeBtn();
});

/* ── Budget Bar ────────────────────────────────────── */

async function loadBudget() {
  try {
    var res = await fetch('/api/budget');
    if (!res.ok) throw new Error();
    var json = await res.json();
    var pct = Math.min((json.used / json.limit) * 100, 100);
    var fill = document.getElementById('budgetFill');
    var label = document.getElementById('budgetLabel');
    fill.style.width = pct + '%';
    fill.style.background = pct < 50 ? 'var(--green)' : pct < 80 ? 'var(--amber)' : 'var(--red)';
    label.textContent = json.used.toLocaleString() + ' of ' + json.limit.toLocaleString() + ' daily tokens used';
  } catch (e) {
    var wrap = document.getElementById('budgetWrap');
    if (wrap) wrap.style.display = 'none';
  }
}

/* ── Tabs ──────────────────────────────────────────── */

function setupTabs() {
  var tabUrl = document.getElementById('tabUrl');
  var tabUpload = document.getElementById('tabUpload');
  var urlSection = document.getElementById('urlSection');
  var uploadSection = document.getElementById('uploadSection');

  tabUrl.addEventListener('click', function () {
    tabUrl.classList.add('active');
    tabUpload.classList.remove('active');
    urlSection.classList.remove('hidden');
    uploadSection.classList.add('hidden');
    updateAnalyzeBtnState();
  });

  tabUpload.addEventListener('click', function () {
    tabUpload.classList.add('active');
    tabUrl.classList.remove('active');
    uploadSection.classList.remove('hidden');
    urlSection.classList.add('hidden');
    updateAnalyzeBtnState();
  });

  var dropZone = document.getElementById('dropZone');
  dropZone.addEventListener('click', function () {
    document.getElementById('fileInput').click();
  });
}

/* ── URL Input ─────────────────────────────────────── */

function setupUrlInput() {
  document.getElementById('urlInput').addEventListener('input', function () {
    updateAnalyzeBtnState();
  });
}

function updateAnalyzeBtnState() {
  var btn = document.getElementById('analyzeBtn');
  var isUrlTab = document.getElementById('tabUrl').classList.contains('active');
  if (isUrlTab) {
    var url = document.getElementById('urlInput').value.trim();
    btn.disabled = !(url.startsWith('http://') || url.startsWith('https://'));
  } else {
    btn.disabled = !selectedFile;
  }
}

/* ── File Upload ───────────────────────────────────── */

function setupUpload() {
  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', function (e) {
    handleFile(e.target.files[0]);
  });
}

function handleFile(file) {
  if (!file) return;
  hideError('formError');

  if (file.size > 50 * 1024 * 1024) {
    showError('formError', 'File too large. Maximum size is 50MB.');
    return;
  }

  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    showError('formError', 'Only image and video files are accepted.');
    return;
  }

  selectedFile = file;
  var label = document.getElementById('fileLabel');
  label.textContent = file.name.length > 35 ? file.name.substring(0, 32) + '...' : file.name;
  updateAnalyzeBtnState();

  var preview = document.getElementById('imagePreview');
  if (file.type.startsWith('image/')) {
    var reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  } else {
    preview.classList.add('hidden');
  }
}

/* ── Analyze ───────────────────────────────────────── */

function setupAnalyzeBtn() {
  document.getElementById('analyzeBtn').addEventListener('click', handleAnalyze);
}

async function handleAnalyze() {
  hideError('formError');
  var isUrlTab = document.getElementById('tabUrl').classList.contains('active');

  if (isUrlTab) {
    var url = document.getElementById('urlInput').value.trim();
    if (!url) {
      showError('formError', 'Please enter a URL.');
      return;
    }
    startLoading();
    try {
      var res = await fetch('/api/analyze', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type: 'url', url: url })
      });
      var data = await res.json();
      if (res.ok) {
        window.location.href = '/scan.html?id=' + data.scanId;
      } else {
        stopLoading();
        showError('formError', data.error || 'Analysis failed. Please try again.');
      }
    } catch (err) {
      stopLoading();
      showError('formError', 'Network error. Please check your connection.');
    }
  } else {
    if (!selectedFile) {
      showError('formError', 'Please select a file.');
      return;
    }
    startLoading();
    try {
      updateLoadingText('Uploading file...');
      var formData = new FormData();
      formData.append('file', selectedFile);

      var headers = uploadAuthHeaders();

      var uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: headers,
        body: formData
      });
      var uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

      updateLoadingText('Analyzing media...');
      var analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type: 'upload', tempFileId: uploadData.tempFileId })
      });
      var analyzeData = await analyzeRes.json();
      if (analyzeRes.ok) {
        window.location.href = '/scan.html?id=' + analyzeData.scanId;
      } else {
        throw new Error(analyzeData.error || 'Analysis failed');
      }
    } catch (err) {
      stopLoading();
      showError('formError', err.message);
    }
  }
}

/* ── Loading Overlay ───────────────────────────────── */

function startLoading() {
  document.getElementById('loadingOverlay').classList.remove('hidden');
  document.getElementById('analyzeBtn').disabled = true;
  var idx = 0;
  updateLoadingText(LOADING_MESSAGES[0]);
  loadingInterval = setInterval(function () {
    idx = (idx + 1) % LOADING_MESSAGES.length;
    updateLoadingText(LOADING_MESSAGES[idx]);
  }, 3000);
}

function stopLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
  clearInterval(loadingInterval);
  loadingInterval = null;
  updateAnalyzeBtnState();
}

function updateLoadingText(text) {
  var el = document.getElementById('loadingText');
  if (el) el.textContent = text;
}
