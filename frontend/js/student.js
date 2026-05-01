/* ── Student Dashboard ── */
const currentUser = requireAuth('student');
if (!currentUser) throw new Error('Unauthorized');

let allProjects = [];
let versionTargetId = null;

document.addEventListener('DOMContentLoaded', () => {
  populateNavbar(currentUser);
  const sn = document.getElementById('student-name');
  if (sn) sn.textContent = currentUser.name.split(' ')[0];
  init();
});

async function init() {
  await Promise.all([loadStats(), loadProjects()]);
}

async function loadStats() {
  try {
    const { stats } = await API.getStats();
    setText('stat-total',    stats.total);
    setText('stat-pending',  stats.pending + stats.under_review);
    setText('stat-reviewed', stats.reviewed);
    setText('stat-avg',      stats.avgMarks ? (+stats.avgMarks).toFixed(1) : '—');
  } catch {}
}

async function loadProjects() {
  try {
    const { projects } = await API.getMyProjects();
    allProjects = projects;
    renderCards(projects);
  } catch (e) {
    setHtml('projects-grid', `<div class="alert alert-error" style="grid-column:1/-1;">${e.message}</div>`);
  }
}

function renderCards(projects) {
  const grid = document.getElementById('projects-grid');
  if (!projects.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">📭</div><h3>No projects yet</h3>
        <p>Submit your first project to get started!</p>
        <a href="/upload-project.html" class="btn btn-primary mt-2">➕ Submit Project</a>
      </div>`;
    return;
  }
  grid.innerHTML = projects.map(p => {
    const dl  = p.deadline ? getDeadlineStatus(p.deadline) : null;
    const can = ['pending','resubmit','rejected'].includes(p.status);
    return `
    <div class="project-card">
      <div class="project-card-header">
        <div>
          <div class="project-title">${esc(p.title)}</div>
          <div class="project-meta">
            <span>📂 ${p.category||'General'}</span>
            <span>🔖 v${p.currentVersion}</span>
            ${dl ? `<span class="${dl.cls}">⏰ ${dl.label}</span>` : ''}
          </div>
        </div>
        ${statusBadge(p.status)}
      </div>
      <div class="project-desc">${esc(p.description)}</div>
      <div class="project-footer">
        <div>
          ${p.marks !== null
            ? `<div class="marks-badge">🏆 ${p.marks}<small>/100</small></div>`
            : `<span class="text-muted" style="font-size:.85rem;">Not graded</span>`}
          <div style="font-size:.75rem;color:var(--text-muted);">${formatDate(p.createdAt)}</div>
        </div>
        <div class="flex gap-1">
          <button class="btn btn-secondary btn-sm" onclick="viewDetail('${p._id}')">👁 View</button>
          <a href="/review.html?id=${p._id}" class="btn btn-info btn-sm">💬 Reviews</a>
          ${can ? `<button class="btn btn-primary btn-sm" onclick="openVersionModal('${p._id}')">📤 Update</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterProjects() {
  const q = (document.getElementById('search-input')?.value||'').toLowerCase();
  const s = document.getElementById('status-filter')?.value||'all';
  renderCards(allProjects.filter(p =>
    (p.title.toLowerCase().includes(q)||p.description.toLowerCase().includes(q)) &&
    (s==='all'||p.status===s)
  ));
}

function showSection(id) {
  ['my-projects','reviews-section'].forEach(s =>
    document.getElementById(s)?.classList.toggle('hidden', s!==id));
  if (id==='reviews-section') loadReviews();
}

async function loadReviews() {
  const list = document.getElementById('reviews-list');
  list.innerHTML = spinner();
  try {
    const { projects } = await API.getMyProjects();
    let html = '';
    for (const p of projects) {
      const { reviews } = await API.getProjectReviews(p._id);
      if (!reviews.length) continue;
      html += `<div class="mb-3"><h4 class="mb-1">📁 ${esc(p.title)}</h4>
        ${reviews.map(r => `
          <div class="review-card mt-2">
            <div class="review-header">
              <div class="reviewer-info">
                <div class="reviewer-avatar">${getInitials(r.teacher?.name)}</div>
                <div>
                  <div style="font-weight:600;">${esc(r.teacher?.name||'Teacher')}</div>
                  <div class="text-muted" style="font-size:.8rem;">v${r.versionReviewed} · ${formatDate(r.createdAt)}</div>
                </div>
              </div>
              <div class="flex gap-1 items-center">
                ${r.marks!==null?`<span class="fw-bold text-primary">🏆 ${r.marks}/100</span>`:''}
                ${statusBadge(r.status)}
              </div>
            </div>
            <div class="review-comment">💬 ${esc(r.comment)}</div>
            ${r.feedback?`<div class="review-feedback">📝 ${esc(r.feedback)}</div>`:''}
          </div>`).join('')}
      </div>`;
    }
    list.innerHTML = html || emptyState('💬','No reviews yet','Submit a project and wait for feedback.');
  } catch (e) {
    list.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
  }
}

async function viewDetail(id) {
  openModal('detail-modal');
  setHtml('detail-body', spinner());
  try {
    const [{ project }, { reviews }] = await Promise.all([API.getProject(id), API.getProjectReviews(id)]);
    document.getElementById('detail-title').textContent = project.title;
    setHtml('detail-body', `
      <div class="flex justify-between items-center mb-2">
        ${statusBadge(project.status)}
        ${project.marks!==null?`<span class="fw-bold text-primary" style="font-size:1.2rem;">🏆 ${project.marks}/100</span>`:''}
      </div>
      <p class="text-muted mb-3">${esc(project.description)}</p>
      <div class="grid-2 mb-3" style="font-size:.9rem;">
        <div><span class="text-muted">Category:</span> <strong>${project.category||'—'}</strong></div>
        <div><span class="text-muted">Deadline:</span> <strong>${formatDate(project.deadline)}</strong></div>
        <div><span class="text-muted">Submitted:</span> <strong>${formatDate(project.createdAt)}</strong></div>
        <div><span class="text-muted">Versions:</span> <strong>${project.currentVersion}</strong></div>
      </div>
      <h4 class="mb-2">📜 Version History</h4>
      <div class="version-timeline mb-3">
        ${project.versions.map(v=>`
          <div class="version-item">
            <div class="version-date">${formatDate(v.uploadedAt)}</div>
            <div class="version-note">v${v.versionNumber} — ${esc(v.fileName)} <span class="text-muted">(${formatSize(v.fileSize)})</span></div>
            <div class="text-muted" style="font-size:.8rem;">${esc(v.notes||'')}</div>
            <a href="/uploads/${v.filePath.split('/').pop()}" target="_blank" class="btn btn-secondary btn-sm mt-1">⬇ Download</a>
          </div>`).join('')}
      </div>
      <h4 class="mb-2">💬 Reviews (${reviews.length})</h4>
      ${reviews.length ? reviews.map(r=>`
        <div class="review-card mb-2">
          <div class="review-header">
            <div class="reviewer-info">
              <div class="reviewer-avatar">${getInitials(r.teacher?.name)}</div>
              <div>
                <div style="font-weight:600;">${esc(r.teacher?.name||'Teacher')}</div>
                <div class="text-muted" style="font-size:.8rem;">${formatDate(r.createdAt)}</div>
              </div>
            </div>
            ${r.marks!==null?`<strong class="text-primary">🏆 ${r.marks}/100</strong>`:''}
          </div>
          <div class="review-comment">${esc(r.comment)}</div>
          ${r.feedback?`<div class="review-feedback">${esc(r.feedback)}</div>`:''}
        </div>`).join('') : '<p class="text-muted">No reviews yet.</p>'}
    `);
  } catch (e) {
    setHtml('detail-body', `<div class="alert alert-error">${e.message}</div>`);
  }
}

function openVersionModal(id) {
  versionTargetId = id;
  document.getElementById('version-notes').value = '';
  document.getElementById('version-file').value  = '';
  document.getElementById('version-file-info').classList.add('hidden');
  document.getElementById('version-alert').classList.add('hidden');
  document.getElementById('version-drop').innerHTML = `<div class="upload-icon">📎</div><p>Click to choose or drag &amp; drop</p>`;
  openModal('version-modal');
}

function onVersionFileSelect(input) {
  const file = input.files[0]; if (!file) return;
  const info = document.getElementById('version-file-info');
  info.innerHTML = `<span>📎</span><div><div class="file-name">${esc(file.name)}</div><div class="file-size">${formatSize(file.size)}</div></div>`;
  info.classList.remove('hidden');
}

async function submitVersion() {
  const notes = document.getElementById('version-notes').value.trim();
  const file  = document.getElementById('version-file').files[0];
  const btn   = document.getElementById('version-submit-btn');
  const ale   = document.getElementById('version-alert');
  if (!notes) return inlineAlert(ale, 'Version notes are required.');
  if (!file)  return inlineAlert(ale, 'Please select a file.');
  const fd = new FormData();
  fd.append('projectFile', file);
  fd.append('versionNotes', notes);
  setLoading(btn, true);
  try {
    await API.uploadVersion(versionTargetId, fd);
    closeModal('version-modal');
    showToast('New version uploaded!');
    loadProjects();
  } catch (e) {
    inlineAlert(ale, e.message);
  } finally {
    setLoading(btn, false);
  }
}

/* helpers */
function setText(id, v) { const e=document.getElementById(id); if(e) e.textContent=v; }
function setHtml(id, h) { const e=document.getElementById(id); if(e) e.innerHTML=h;   }
function esc(s) { const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }
function spinner() { return `<div class="page-loading"><div class="spinner" style="border-color:#e2e8f0;border-top-color:#4f46e5;width:36px;height:36px;"></div></div>`; }
function emptyState(ic,t,d) { return `<div class="empty-state"><div class="empty-icon">${ic}</div><h3>${t}</h3><p>${d}</p></div>`; }
function inlineAlert(el,msg,type='error') { el.className=`alert alert-${type}`; el.textContent=msg; el.classList.remove('hidden'); }
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{ if(e.target===o) o.classList.remove('open'); }));