/* ───────────────────────────────────────────────────
   main.js — Homepage logic (index.html only)
   ─────────────────────────────────────────────────── */

var selectedFile = null;

const PIPELINE_STEPS = [
  { key: 'BUDGET',   label: 'Checking daily budget'      },
  { key: 'VALIDATE', label: 'Validating input'           },
  { key: 'FETCH',    label: 'Fetching media'             },
  { key: 'EXTRACT',  label: 'Extracting video frames'    },
  { key: 'FORENSIC', label: 'Running forensic analysis'  },
  { key: 'EDUCATION',label: 'Generating explanation'     },
  { key: 'SAVING',   label: 'Saving results'             },
  { key: 'COMPLETE', label: 'Analysis complete'          }
];

const stepStartTimes = {};

function initProgressUI() {
  const container = document.getElementById('progressSteps');
  container.innerHTML = '';
  PIPELINE_STEPS.forEach((step, i) => {
    const div = document.createElement('div');
    div.className = 'progress-step waiting';
    div.id = 'step-' + step.key;
    div.innerHTML = `
      <div class="step-icon">${i + 1}</div>
      <div class="step-label">${step.label}</div>
      <div class="step-time" id="time-${step.key}"></div>
    `;
    container.appendChild(div);
  });
  document.getElementById('progressBarFill').style.width = '0%';
  document.getElementById('progressSubtitle').textContent = 'Starting...';
}

function setStepActive(key, label) {
  const el = document.getElementById('step-' + key);
  if (!el) return;
  el.className = 'progress-step active';
  if (label) el.querySelector('.step-label').textContent = label;
  stepStartTimes[key] = Date.now();
  document.getElementById('progressSubtitle').textContent = label || el.querySelector('.step-label').textContent;
}

function setStepDone(key) {
  const el = document.getElementById('step-' + key);
  if (!el) return;
  el.className = 'progress-step done';
  el.querySelector('.step-icon').textContent = '✓';
  if (stepStartTimes[key]) {
    const elapsed = ((Date.now() - stepStartTimes[key]) / 1000).toFixed(1);
    document.getElementById('time-' + key).textContent = elapsed + 's';
  }
}

function setStepError(key) {
  const el = document.getElementById('step-' + key);
  if (!el) return;
  el.className = 'progress-step error';
  el.querySelector('.step-icon').textContent = '✗';
}

function updateProgressBar(step, total) {
  const pct = Math.round((step / total) * 100);
  document.getElementById('progressBarFill').style.width = pct + '%';
}

function showLoadingOverlay() {
  document.getElementById('loadingOverlay').classList.remove('hidden');
  document.getElementById('analyzeBtn').disabled = true;
}

function hideLoadingOverlay() {
  document.getElementById('loadingOverlay').classList.add('hidden');
  document.getElementById('analyzeBtn').disabled = false;
  updateAnalyzeBtnState();
}

function getStepKeyByNumber(stepNum) {
  const keys = ['BUDGET','VALIDATE','FETCH','EXTRACT','FORENSIC','EDUCATION','SAVING','COMPLETE'];
  return keys[stepNum - 1] || 'COMPLETE';
}

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
  const isUrlTab = document.getElementById('tabUrl').classList.contains('active');
  
  let requestBody;
  
  if (isUrlTab) {
    const url = document.getElementById('urlInput').value.trim();
    if (!url) {
      showError('formError', 'Please enter a URL.');
      return;
    }
    requestBody = { type: 'url', url };
  } else {
    if (!selectedFile) {
      showError('formError', 'Please select a file.');
      return;
    }
    
    // Show overlay early for upload
    initProgressUI();
    showLoadingOverlay();
    setStepActive('VALIDATE', 'Uploading file...');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: uploadAuthHeaders(),
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
      setStepDone('VALIDATE');
      requestBody = { type: 'upload', tempFileId: uploadData.tempFileId };
    } catch (err) {
      setStepError('VALIDATE');
      hideLoadingOverlay();
      showError('formError', err.message);
      return;
    }
  }
  
  // Now start the SSE stream
  initProgressUI();
  showLoadingOverlay();
  
  let currentStepKey = null;
  
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok && !response.body) {
      throw new Error('Server error: ' + response.status);
    }
    
    // Read the SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE messages (split on double newline)
      const messages = buffer.split('\n\n');
      buffer = messages.pop(); // keep incomplete last chunk
      
      for (const message of messages) {
        if (!message.trim()) continue;
        const line = message.replace(/^data: /, '').trim();
        if (!line) continue;
        
        try {
          const event = JSON.parse(line);
          
          if (event.error) {
            // Handle error event
            if (currentStepKey) setStepError(currentStepKey);
            hideLoadingOverlay();
            showError('formError', event.message || 'Analysis failed.');
            return;
          }
          
          if (event.done && event.result) {
            // Complete — set last step done and redirect
            setStepDone('COMPLETE');
            updateProgressBar(8, 8);
            
            // Wait briefly so user sees completion
            await new Promise(r => setTimeout(r, 800));
            hideLoadingOverlay();
            window.location.href = '/scan.html?id=' + event.result.scanId;
            return;
          }
          
          // Otherwise it's a progress step:
          const stepKey = getStepKeyByNumber(event.step);
          
          // Mark previous step as done
          if (currentStepKey && currentStepKey !== stepKey) {
            setStepDone(currentStepKey);
          }
          
          // Set current step active
          currentStepKey = stepKey;
          setStepActive(stepKey, event.label);
          updateProgressBar(event.step - 1, event.total);
        } catch (parseErr) {
          console.warn('Could not parse SSE message:', line);
        }
      }
    }
  } catch (err) {
    hideLoadingOverlay();
    showError('formError', err.message || 'Network error. Check your connection.');
  }
}
