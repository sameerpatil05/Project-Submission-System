/* ── Review page (shared teacher + student) ── */
const currentUser = requireAuth();
if (!currentUser) throw new Error('Unauthorized');
const projectId   = new URLSearchParams(window.location.search).get('id');
if (!projectId) window.location.href = currentUser.role==='teacher' ? '/teacher-dashboard.html' : '/student-dashboard.html';

document.addEventListener('DOMContentLoaded', () => {
  populateNavbar(currentUser);
  const back = document.getElementById('back-btn');
  if (back) back.href = currentUser.role==='teacher' ? '/teacher-dashboard.html' : '/student-dashboard.html';
  if (currentUser.role !== 'teacher') document.getElementById('review-form-card')?.classList.add('hidden');
  loadProject();
  loadReviews();
});

async function loadProject() {
  try {
    const { project } = await API.getProject(projectId);
    const titleEl = document.getElementById('project-title');
    const metaEl  = document.getElementById('project-meta');
    if (titleEl) titleEl.textContent = project.title;
    if (metaEl)  metaEl.innerHTML = `${statusBadge(project.status)} ${project.marks!==null?`<strong class="text-primary" style="margin-left:.5rem;">🏆 ${project.marks}/100</strong>`:''}`;
    setHtml('project-info', `
      <div class="mb-2"><strong>Description</strong><p class="text-muted mt-1">${esc(project.description)}</p></div>
      <div class="grid-2" style="font-size:.9rem;gap:.75rem;">
        <div><span class="text-muted">Student:</span><br><strong>${esc(project.student?.name||'—')}</strong></div>
        <div><span class="text-muted">Enrollment:</span><br><strong>${project.student?.enrollmentId||'—'}</strong></div>
        <div><span class="text-muted">Category:</span><br><strong>${project.category||'—'}</strong></div>
        <div><span class="text-muted">Deadline:</span><br><strong>${formatDate(project.deadline)}</strong></div>
        <div><span class="text-muted">Submitted:</span><br><strong>${formatDate(project.createdAt)}</strong></div>
        <div><span class="text-muted">Version:</span><br><strong>v${project.currentVersion}</strong></div>
      </div>`);
    setHtml('version-list', project.versions.map(v=>`
      <div class="version-item">
        <div class="version-date">${formatDate(v.uploadedAt)}</div>
        <div class="version-note">v${v.versionNumber} — <span style="font-weight:500;">${esc(v.fileName)}</span></div>
        ${v.notes?`<div class="text-muted" style="font-size:.8rem;">${esc(v.notes)}</div>`:''}
        <div class="flex gap-1 mt-1">
          <a href="/uploads/${v.filePath.split('/').pop()}" target="_blank" class="btn btn-secondary btn-sm">⬇ Download v${v.versionNumber}</a>
          <span class="text-muted" style="font-size:.8rem;align-self:center;">${formatSize(v.fileSize)}</span>
        </div>
      </div>`).join(''));
  } catch(e) { setHtml('project-info',`<div class="alert alert-error">${e.message}</div>`); }
}

async function loadReviews() {
  const container = document.getElementById('reviews-container');
  container.innerHTML = spinner();
  try {
    const { reviews } = await API.getProjectReviews(projectId);
    const cnt = document.getElementById('review-count');
    if (cnt) cnt.textContent = reviews.length;
    if (!reviews.length) { container.innerHTML = emptyState('💬','No reviews yet','Awaiting teacher feedback.'); return; }
    container.innerHTML = reviews.map(r => {
      const isOwner = currentUser.role==='teacher' && r.teacher?._id===currentUser.id;
      return `
      <div class="review-card mb-2">
        <div class="review-header">
          <div class="reviewer-info">
            <div class="reviewer-avatar">${getInitials(r.teacher?.name)}</div>
            <div>
              <div style="font-weight:600;">${esc(r.teacher?.name||'Teacher')}</div>
              <div class="text-muted" style="font-size:.8rem;">v${r.versionReviewed} · ${formatDate(r.createdAt)}</div>
            </div>
          </div>
          <div class="flex gap-1 items-center">
            ${r.marks!==null?`<strong class="text-primary">🏆 ${r.marks}/100</strong>`:''}
            ${statusBadge(r.status)}
          </div>
        </div>
        <div class="review-comment">💬 ${esc(r.comment)}</div>
        ${r.feedback?`<div class="review-feedback">📝 ${esc(r.feedback)}</div>`:''}
        ${isOwner?`
          <div class="flex gap-1 mt-2">
            <button class="btn btn-warning btn-sm" onclick="openEdit('${r._id}',\`${esc(r.comment)}\`,\`${esc(r.feedback||'')}\`,${r.marks??'null'},'${r.status}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm"  onclick="deleteReview('${r._id}')">🗑 Delete</button>
          </div>`:''}
      </div>`;
    }).join('');
  } catch(e) { container.innerHTML=`<div class="alert alert-error">${e.message}</div>`; }
}

async function submitReview() {
  const comment  = document.getElementById('r-comment').value.trim();
  const feedback = document.getElementById('r-feedback').value.trim();
  const marksVal = document.getElementById('r-marks').value;
  const status   = document.getElementById('r-status').value;
  const btn      = document.getElementById('review-btn');
  const ale      = document.getElementById('review-alert');
  ale.classList.add('hidden');
  if (!comment) return inlineAlert(ale,'Comment is required.');
  const marks = marksVal!=='' ? parseInt(marksVal) : null;
  if (marks!==null&&(isNaN(marks)||marks<0||marks>100)) return inlineAlert(ale,'Marks must be 0–100.');
  setLoading(btn,true);
  try {
    await API.addReview(projectId,{comment,feedback,status,marks});
    inlineAlert(ale,'✅ Review submitted!','success');
    document.getElementById('r-comment').value='';
    document.getElementById('r-feedback').value='';
    document.getElementById('r-marks').value='';
    loadReviews(); loadProject();
  } catch(e) { inlineAlert(ale,e.message); }
  finally { setLoading(btn,false); }
}

function openEdit(id,comment,feedback,marks,status) {
  document.getElementById('edit-review-id').value      = id;
  document.getElementById('edit-r-comment').value      = comment;
  document.getElementById('edit-r-feedback').value     = feedback;
  document.getElementById('edit-r-marks').value        = marks!==null ? marks : '';
  document.getElementById('edit-r-status').value       = status;
  document.getElementById('edit-review-alert').classList.add('hidden');
  openModal('edit-review-modal');
}

async function saveEdit() {
  const id       = document.getElementById('edit-review-id').value;
  const comment  = document.getElementById('edit-r-comment').value.trim();
  const feedback = document.getElementById('edit-r-feedback').value.trim();
  const marksVal = document.getElementById('edit-r-marks').value;
  const status   = document.getElementById('edit-r-status').value;
  const btn      = document.getElementById('edit-review-btn');
  const ale      = document.getElementById('edit-review-alert');
  ale.classList.add('hidden');
  if (!comment) return inlineAlert(ale,'Comment is required.');
  const marks = marksVal!=='' ? parseInt(marksVal) : null;
  setLoading(btn,true);
  try {
    await API.updateReview(id,{comment,feedback,status,marks});
    closeModal('edit-review-modal'); showToast('Review updated!');
    loadReviews(); loadProject();
  } catch(e) { inlineAlert(ale,e.message); }
  finally { setLoading(btn,false); }
}

async function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  try { await API.deleteReview(id); showToast('Review deleted.'); loadReviews(); }
  catch(e) { showToast(e.message,'error'); }
}

/* helpers */
function setHtml(id,h) { const e=document.getElementById(id);if(e) e.innerHTML=h; }
function esc(s) { const d=document.createElement('div');d.textContent=s||'';return d.innerHTML; }
function spinner() { return `<div class="page-loading"><div class="spinner" style="border-color:#e2e8f0;border-top-color:#4f46e5;width:36px;height:36px;"></div></div>`; }
function emptyState(ic,t,d) { return `<div class="empty-state" style="padding:1.5rem;"><div class="empty-icon">${ic}</div><h3>${t}</h3><p>${d}</p></div>`; }
function inlineAlert(el,msg,type='error') { el.className=`alert alert-${type}`;el.textContent=msg;el.classList.remove('hidden'); }
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{ if(e.target===o) o.classList.remove('open'); }));