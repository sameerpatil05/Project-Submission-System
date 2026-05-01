/* ── Shared helpers ── */

function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); }
  catch { return null; }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/index.html';
}

function requireAuth(role = null) {
  const token = localStorage.getItem('token');
  const user  = getUser();
  if (!token || !user) { window.location.href = '/index.html'; return null; }
  if (role && user.role !== role) { window.location.href = '/index.html'; return null; }
  return user;
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatSize(bytes) {
  if (!bytes) return '';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k,i)).toFixed(1))} ${sizes[i]}`;
}

function getDeadlineStatus(deadline) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  if (days < 0)  return { label: `Overdue by ${Math.abs(days)}d`, cls: 'deadline-overdue' };
  if (days <= 3) return { label: `${days}d left`, cls: 'deadline-warning' };
  return           { label: `${days}d left`, cls: 'deadline-ok' };
}

function statusBadge(status) {
  return `<span class="badge badge-${status}">${(status || '').replace('_',' ')}</span>`;
}

function getInitials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
}

function populateNavbar(user) {
  const avatar = document.getElementById('nav-avatar');
  const nameEl = document.getElementById('nav-name');
  const roleEl = document.querySelector('.user-role');
  if (avatar) avatar.textContent = getInitials(user.name);
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.innerHTML   = `<span class="badge badge-${user.role}">${user.role}</span>`;
  document.querySelectorAll('.logout-btn').forEach(b => b.addEventListener('click', logout));
}

function setLoading(btn, on) {
  if (on) {
    btn.disabled   = true;
    btn._savedHTML = btn.innerHTML;
    btn.innerHTML  = '<span class="spinner"></span> Loading…';
  } else {
    btn.disabled  = false;
    btn.innerHTML = btn._savedHTML || 'Submit';
  }
}

function showToast(message, type = 'success') {
  let wrap = document.getElementById('_toast_wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = '_toast_wrap';
    wrap.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className  = `alert alert-${type}`;
  t.style.cssText = 'min-width:260px;box-shadow:0 4px 12px rgba(0,0,0,.15);animation:slideIn .3s ease;';
  const icons  = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  t.textContent = `${icons[type] || ''} ${message}`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s'; t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}