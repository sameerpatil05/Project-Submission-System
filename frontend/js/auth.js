/* ── Auth page logic ── */

// Redirect if already logged in
(function () {
  const token = localStorage.getItem('token');
  const user  = getUser();
  if (token && user) {
    window.location.href = user.role === 'teacher'
      ? '/teacher-dashboard.html' : '/student-dashboard.html';
  }
})();

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.auth-form').forEach(f =>
    f.classList.toggle('active', f.id === `${tab}-form`));
  clearAlert();
}
document.querySelectorAll('.auth-tab').forEach(t =>
  t.addEventListener('click', () => switchTab(t.dataset.tab)));

let selectedRole = 'student';
function selectRole(role, el) {
  selectedRole = role;
  document.getElementById('reg-role').value = role;
  document.querySelectorAll('.role-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  const eg = document.getElementById('enrollment-group');
  if (eg) eg.style.display = role === 'student' ? 'block' : 'none';
}

function showAlert(msg, type = 'error') {
  const el = document.getElementById('auth-alert');
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearAlert() {
  document.getElementById('auth-alert').classList.add('hidden');
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');
  clearAlert();
  if (!email || !password) return showAlert('Please enter email and password.');
  setLoading(btn, true);
  try {
    const data = await API.login({ email, password });
    saveSession(data.token, data.user);
    showAlert('Login successful! Redirecting…', 'success');
    setTimeout(() => {
      window.location.href = data.user.role === 'teacher'
        ? '/teacher-dashboard.html' : '/student-dashboard.html';
    }, 700);
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(btn, false);
  }
}

async function handleRegister() {
  const name         = document.getElementById('reg-name').value.trim();
  const email        = document.getElementById('reg-email').value.trim();
  const password     = document.getElementById('reg-password').value;
  const role         = document.getElementById('reg-role').value;
  const enrollmentId = document.getElementById('reg-enrollment')?.value.trim();
  const department   = document.getElementById('reg-department').value;
  const btn          = document.getElementById('reg-btn');
  clearAlert();
  if (!name || !email || !password)
    return showAlert('Name, email and password are required.');
  if (password.length < 6)
    return showAlert('Password must be at least 6 characters.');
  setLoading(btn, true);
  try {
    const data = await API.register({ name, email, password, role, enrollmentId, department });
    saveSession(data.token, data.user);
    showAlert('Account created! Redirecting…', 'success');
    setTimeout(() => {
      window.location.href = data.user.role === 'teacher'
        ? '/teacher-dashboard.html' : '/student-dashboard.html';
    }, 700);
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(btn, false);
  }
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  document.getElementById('login-form').classList.contains('active')
    ? handleLogin() : handleRegister();
});