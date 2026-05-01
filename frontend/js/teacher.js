/* ── Teacher Dashboard ── */
const currentUser = requireAuth('teacher');
if (!currentUser) throw new Error('Unauthorized');

let allProjects = [];
let reviewTargetId = null;

document.addEventListener('DOMContentLoaded', () => {
  populateNavbar(currentUser);
  init();
});

async function init() {
  await Promise.all([loadStats(), loadAllProjects()]);
}

async function loadStats() {
  try {
    const { stats } = await API.getStats();
    setText('stat-total',     stats.total);
    setText('stat-pending',   stats.pending);
    setText('stat-reviewing', stats.under_review);
    setText('stat-reviewed',  stats.reviewed);
  } catch {}
}

async function loadAllProjects() {
  try {
    const { projects } = await API.getAllProjects();
    allProjects = projects;
    renderTable(projects);
  } catch (e) {
    setHtml('projects-tbody', `<tr><td colspan="7"><div class="alert alert-error">${e.message}</div></td></tr>`);
  }
}

function renderTable(projects) {
  const tb = document.getElementById('projects-tbody');
  if (!projects.length) {
    tb.innerHTML = `<tr><td colspan="7">${emptyState('📭','No projects found','')}</td></tr>`;
    return;
  }
  tb.innerHTML = projects.map(p => {
    const dl = p.deadline ? getDeadlineStatus(p.deadline) : null;
    return `<tr>
      <td>
        <div style="font-weight:600;">${esc(p.title)}</div>
        <div style="font-size:.8rem;color:var(--text-muted);">${p.category||'General'}</div>
      </td>
      <td>
        <div style="font-weight:500;">${esc(p.student?.name||'—')}</div>
        <div style="font-size:.8rem;color:var(--text-muted);">${p.student?.enrollmentId||p.student?.email||''}</div>
      </td>
      <td><span class="badge" style="background:#e0e7ff;color:#3730a3;">v${p.currentVersion}</span></td>
      <td>${statusBadge(p.status)}</td>
      <td>${p.marks!==null?`<strong>${p.marks}/100</strong>`:'<span class="text-muted">—</span>'}</td>
      <td>${dl?`<span class="${dl.cls}" style="font-size:.85rem;">${dl.label}</span>`:'<span class="text-muted">—</span>'}</td>
      <td>
        <div class="flex gap-1">
          <button class="btn btn-secondary btn-sm" onclick="viewDetail('${p._id}')">👁</button>
          <button class="btn btn-primary btn-sm"   onclick="openReviewModal('${p._id}')">✍️ Review</button>
          ${p.status==='pending'?`<button class="btn btn-info btn-sm" onclick="assignSelf('${p._id}')">📋 Claim</button>`:''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterProjects() {
  const q = (document.getElementById('search-input')?.value||'').toLowerCase();
  const s = document.getElementById('status-filter')?.value||'all';
  renderTable(allProjects.filter(p =>
    (p.title.toLowerCase().includes(q)||(p.student?.name||'').toLowerCase().includes(q)) &&
    (s==='all'||p.status===s)
  ));
}

async function assignSelf(id) {
  try {
    await API.assignTeacher(id);
    showToast('You are now assigned as reviewer.');
    await loadAllProjects();
  } catch (e) { showToast(e.message,'error'); }
}

function showSection(id) {
  ['all-projects','my-reviews'].forEach(s =>
    document.getElementById(s)?.classList.toggle('hidden',s!==id));
  if (id==='my-reviews') loadMyReviews();
}

async function loadMyReviews() {
  const list = document.getElementById('reviews-list');
  list.innerHTML = spinner();
  try {
    const { reviews } = await API.getTeacherReviews();
    if (!reviews.length) { list.innerHTML = emptyState('💬','No reviews yet','Start reviewing submitted projects.'); return; }
    list.innerHTML = reviews.map(r => `
      <div class="review-card mb-2">
        <div class="review-header">
          <div>
            <div style="font-weight:600;">📁 ${esc(r.project?.title||'—')}</div>
            <div class="text-muted" style="font-size:.8rem;">👤 ${esc(r.student?.name||'—')} · v${r.versionReviewed} · ${formatDate(r.createdAt)}</div>
          </div>
          <div class="flex gap-1 items-center">
            ${r.marks!==null?`<strong class="text-primary">🏆 ${r.marks}/100</strong>`:''}
            ${statusBadge(r.status)}
          </div>
        </div>
        <div class="review-comment">💬 ${esc(r.comment)}</div>
        ${r.feedback?`<div class="review-feedback">📝 ${esc(r.feedback)}</div>`:''}
        <div class="flex gap-1 mt-2">
          <a href="/review.html?id=${r.project?._id}" class="btn btn-secondary btn-sm">View Project</a>
          <button class="btn btn-danger btn-sm" onclick="deleteMyReview('${r._id}')">🗑 Delete</button>
        </div>
      </div>`).join('');
  } catch (e) { list.innerHTML = `<div class="alert alert-error">${e.message}</div>`; }
}

async function deleteMyReview(id) {
  if (!confirm('Delete this review?')) return;
  try { await API.deleteReview(id); showToast('Review deleted.'); loadMyReviews(); }
  catch (e) { showToast(e.message,'error'); }
}

async function viewDetail(id) {
  openModal('detail-modal'); setHtml('detail-body', spinner());
  document.getElementById('detail-review-btn').onclick = () => { closeModal('detail-modal'); openReviewModal(id); };
  try {
    const [{ project }, { reviews }] = await Promise.all([API.getProject(id), API.getProjectReviews(id)]);
    document.getElementById('detail-title').textContent = project.title;
    setHtml('detail-body', `
      <div class="flex justify-between items-center mb-2">
        ${statusBadge(project.status)}
        ${project.marks!==null?`<span class="fw-bold text-primary" style="font-size:1.2rem;">🏆 ${project.marks}/100</span>`:''}
      </div>
      <p class="text-muted mb-2">${esc(project.description)}</p>
      <div class="grid-2 mb-3" style="font-size:.9rem;">
        <div><span class="text-muted">Student:</span> <strong>${esc(project.student?.name)}</strong></div>
        <div><span class="text-muted">Enrollment:</span> <strong>${project.student?.enrollmentId||'—'}</strong></div>
        <div><span class="text-muted">Department:</span> <strong>${project.student?.department||'—'}</strong></div>
        <div><span class="text-muted">Deadline:</span> <strong>${formatDate(project.deadline)}</strong></div>
      </div>
      <h4 class="mb-2">📜 Versions (${project.versions.length})</h4>
      <div class="version-timeline mb-3">
        ${project.versions.map(v=>`
          <div class="version-item">
            <div class="version-date">${formatDate(v.uploadedAt)}</div>
            <div class="version-note">v${v.versionNumber} — ${esc(v.fileName)} <span class="text-muted">(${formatSize(v.fileSize)})</span></div>
            ${v.notes?`<div class="text-muted" style="font-size:.8rem;">${esc(v.notes)}</div>`:''}
            <a href="/uploads/${v.filePath.split('/').pop()}" target="_blank" class="btn btn-secondary btn-sm mt-1">⬇ Download v${v.versionNumber}</a>
          </div>`).join('')}
      </div>
      <h4 class="mb-2">💬 Reviews (${reviews.length})</h4>
      ${reviews.length ? reviews.map(r=>`
        <div class="review-card mb-2">
          <div class="review-header">
            <div class="reviewer-info">
              <div class="reviewer-avatar">${getInitials(r.teacher?.name)}</div>
              <div>
                <div style="font-weight:600;">${esc(r.teacher?.name)}</div>
                <div class="text-muted" style="font-size:.8rem;">v${r.versionReviewed} · ${formatDate(r.createdAt)}</div>
              </div>
            </div>
            ${r.marks!==null?`<strong class="text-primary">🏆 ${r.marks}/100</strong>`:''}
          </div>
          <div class="review-comment">${esc(r.comment)}</div>
          ${r.feedback?`<div class="review-feedback">${esc(r.feedback)}</div>`:''}
        </div>`).join('') : '<p class="text-muted">No reviews yet.</p>'}
    `);
  } catch (e) { setHtml('detail-body',`<div class="alert alert-error">${e.message}</div>`); }
}

function openReviewModal(id) {
  reviewTargetId = id;
  document.getElementById('review-comment').value  = '';
  document.getElementById('review-feedback').value = '';
  document.getElementById('review-marks').value    = '';
  document.getElementById('review-status').value   = 'reviewed';
  document.getElementById('review-alert').classList.add('hidden');
  const p = allProjects.find(x=>x._id===id);
  if (p) setHtml('review-project-info', `<strong>${esc(p.title)}</strong> — ${esc(p.student?.name||'')} ${statusBadge(p.status)} <span class="text-muted" style="float:right;">v${p.currentVersion}</span>`);
  openModal('review-modal');
}

async function submitReview() {
  const comment  = document.getElementById('review-comment').value.trim();
  const feedback = document.getElementById('review-feedback').value.trim();
  const marksVal = document.getElementById('review-marks').value;
  const status   = document.getElementById('review-status').value;
  const btn      = document.getElementById('review-submit-btn');
  const ale      = document.getElementById('review-alert');
  if (!comment) return inlineAlert(ale,'Comment is required.');
  const marks = marksVal!=='' ? parseInt(marksVal) : null;
  if (marks!==null&&(isNaN(marks)||marks<0||marks>100)) return inlineAlert(ale,'Marks must be 0–100.');
  setLoading(btn,true);
  try {
    await API.addReview(reviewTargetId,{comment,feedback,status,marks});
    closeModal('review-modal');
    showToast('Review submitted!');
    await Promise.all([loadStats(),loadAllProjects()]);
  } catch(e) { inlineAlert(ale,e.message); }
  finally { setLoading(btn,false); }
}

/* helpers */
function setText(id,v) { const e=document.getElementById(id);if(e) e.textContent=v; }
function setHtml(id,h) { const e=document.getElementById(id);if(e) e.innerHTML=h;   }
function esc(s) { const d=document.createElement('div');d.textContent=s||'';return d.innerHTML; }
function spinner() { return `<div class="page-loading"><div class="spinner" style="border-color:#e2e8f0;border-top-color:#4f46e5;width:36px;height:36px;"></div></div>`; }
function emptyState(ic,t,d) { return `<div class="empty-state" style="padding:2rem;"><div class="empty-icon">${ic}</div><h3>${t}</h3>${d?`<p>${d}</p>`:''}</div>`; }
function inlineAlert(el,msg,type='error') { el.className=`alert alert-${type}`;el.textContent=msg;el.classList.remove('hidden'); }
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{ if(e.target===o) o.classList.remove('open'); }));