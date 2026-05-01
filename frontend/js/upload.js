/* ── Upload Project page ── */
const currentUser = requireAuth('student');
if (!currentUser) throw new Error('Unauthorized');

document.addEventListener('DOMContentLoaded', () => {
  populateNavbar(currentUser);
  const dl = document.getElementById('proj-deadline');
  if (dl) dl.min = new Date().toISOString().split('T')[0];
  initDrop();
});

function initDrop() {
  const zone = document.getElementById('drop-zone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) { syncToInput(file); showPreview(file); }
  });
}

function syncToInput(file) {
  const dt = new DataTransfer(); dt.items.add(file);
  document.getElementById('proj-file').files = dt.files;
}

function onFileSelect(input) { if (input.files[0]) showPreview(input.files[0]); }

function showPreview(file) {
  const ext  = file.name.split('.').pop().toUpperCase();
  const icons = {PDF:'📄',ZIP:'🗜',RAR:'🗜',DOCX:'📝',DOC:'📝',PPTX:'📊',PPT:'📊',TXT:'📃',PNG:'🖼',JPG:'🖼',JPEG:'🖼'};
  const info  = document.getElementById('file-info');
  info.innerHTML = `
    <span style="font-size:1.5rem;">${icons[ext]||'📎'}</span>
    <div>
      <div class="file-name">${esc(file.name)}</div>
      <div class="file-size">${formatSize(file.size)} · ${ext}</div>
    </div>
    <button class="btn btn-sm btn-secondary" onclick="clearFile()" style="margin-left:auto;">✕ Remove</button>`;
  info.classList.remove('hidden');
  document.getElementById('drop-zone').innerHTML =
    `<div class="upload-icon">✅</div><p style="color:var(--success);font-weight:600;">File ready — click to replace</p>`;
}

function clearFile() {
  document.getElementById('proj-file').value = '';
  document.getElementById('file-info').classList.add('hidden');
  document.getElementById('drop-zone').innerHTML = `
    <div class="upload-icon">☁️</div>
    <p><span class="browse">Click to browse</span> or drag &amp; drop your file here</p>
    <p><small class="text-muted">PDF, ZIP, RAR, DOCX, PPTX, TXT, PNG, JPG — Max 50 MB</small></p>`;
}

async function handleSubmit() {
  const title        = document.getElementById('proj-title').value.trim();
  const description  = document.getElementById('proj-desc').value.trim();
  const category     = document.getElementById('proj-category').value;
  const deadline     = document.getElementById('proj-deadline').value;
  const versionNotes = document.getElementById('proj-version-notes').value.trim();
  const file         = document.getElementById('proj-file').files[0];
  const btn          = document.getElementById('submit-btn');
  const ale          = document.getElementById('submit-alert');
  ale.classList.add('hidden');

  if (!title)       return inlineAlert(ale,'Project title is required.');
  if (!description) return inlineAlert(ale,'Project description is required.');
  if (!file)        return inlineAlert(ale,'Please upload a project file.');
  if (file.size > 50*1024*1024) return inlineAlert(ale,'File exceeds 50 MB limit.');

  const fd = new FormData();
  fd.append('title',        title);
  fd.append('description',  description);
  fd.append('category',     category);
  fd.append('versionNotes', versionNotes||'Initial submission');
  fd.append('projectFile',  file);
  if (deadline) fd.append('deadline', deadline);

  startProgress(); setLoading(btn, true);
  try {
    await API.submitProject(fd);
    finishProgress();
    inlineAlert(ale,'✅ Project submitted! Redirecting…','success');
    setTimeout(() => { window.location.href='/student-dashboard.html'; }, 1400);
  } catch(e) {
    resetProgress(); inlineAlert(ale, e.message);
  } finally { setLoading(btn, false); }
}

let _pt = null;
function startProgress() {
  const wrap = document.getElementById('upload-progress-wrap');
  const bar  = document.getElementById('progress-bar');
  const pct  = document.getElementById('progress-pct');
  if (wrap) wrap.classList.remove('hidden');
  let p = 0;
  _pt = setInterval(() => {
    p = Math.min(p + Math.random()*15, 85);
    if (bar) bar.style.width = p+'%';
    if (pct) pct.textContent = Math.round(p)+'%';
  }, 250);
}
function finishProgress() {
  clearInterval(_pt);
  const bar = document.getElementById('progress-bar');
  const pct = document.getElementById('progress-pct');
  if (bar) bar.style.width='100%'; if (pct) pct.textContent='100%';
}
function resetProgress() {
  clearInterval(_pt);
  document.getElementById('upload-progress-wrap')?.classList.add('hidden');
}

function inlineAlert(el,msg,type='error') { el.className=`alert alert-${type}`;el.textContent=msg;el.classList.remove('hidden'); }
function esc(s) { const d=document.createElement('div');d.textContent=s||'';return d.innerHTML; }