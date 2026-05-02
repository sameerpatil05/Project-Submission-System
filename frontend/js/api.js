/* ── All backend API calls ── */
const API_BASE = 'https://project-submission-system-1.onrender.com';

const getToken = () => localStorage.getItem('token');

async function request(method, endpoint, body = null, isFormData = false) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (body) opts.body = isFormData ? body : JSON.stringify(body);

  const res  = await fetch(`${API_BASE}${endpoint}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const API = {
  // Auth
  register:   (d)      => request('POST', '/auth/register', d),
  login:      (d)      => request('POST', '/auth/login', d),
  getMe:      ()       => request('GET',  '/auth/me'),
  getTeachers:()       => request('GET',  '/auth/teachers'),

  // Projects
  submitProject:      (fd)     => request('POST', '/projects', fd, true),
  uploadVersion:      (id, fd) => request('POST', `/projects/${id}/version`, fd, true),
  getMyProjects:      ()       => request('GET',  '/projects/my'),
  getAllProjects:      (q='')   => request('GET',  `/projects?${q}`),
  getProject:         (id)     => request('GET',  `/projects/${id}`),
  assignTeacher:      (id)     => request('PUT',  `/projects/${id}/assign`),
  updateProjectStatus:(id, d)  => request('PUT',  `/projects/${id}/status`, d),
  deleteProject:      (id)     => request('DELETE',`/projects/${id}`),
  getStats:           ()       => request('GET',  '/projects/stats'),

  // Reviews
  addReview:        (pid, d)  => request('POST',  `/reviews/${pid}`, d),
  getProjectReviews:(pid)     => request('GET',   `/reviews/${pid}`),
  updateReview:     (rid, d)  => request('PUT',   `/reviews/single/${rid}`, d),
  deleteReview:     (rid)     => request('DELETE',`/reviews/single/${rid}`),
  getTeacherReviews:()        => request('GET',   '/reviews/teacher/all'),
};