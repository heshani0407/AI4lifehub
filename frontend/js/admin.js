// ══════════════════════════════════════════════════════════════════════════════
//  admin.js — AI4Life Admin Panel
//  All data now stored in the backend (backend/data/*.json via REST API).
//  localStorage is only used to persist the JWT token between page refreshes.
// ══════════════════════════════════════════════════════════════════════════════

// var allows harmless re-declaration when main.js is also loaded on the same page
var API = 'https://ai4lifehub-production.up.railway.app/api';

// ── Token helpers ─────────────────────────────────────────────────────────────
const getToken  = ()  => localStorage.getItem('al4life_token') || '';
const saveToken = (t) => localStorage.setItem('al4life_token', t);
const dropToken = ()  => localStorage.removeItem('al4life_token');

// ── In-memory cache (avoids repeated fetches on the same page) ────────────────
let _certs   = [];
let _courses = [];
let _apps    = [];

// ── Core fetch wrapper ────────────────────────────────────────────────────────
// Attaches the JWT token, parses JSON, and throws on non-2xx responses.
async function apiFetch(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    }
  };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ── UI helpers ────────────────────────────────────────────────────────────────
const escHtml = s => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function showAlert(id, msg, type = 'success', timeout = 5000) {
  const el = document.getElementById(id);
  if (!el) return;
  const icon = type === 'success' ? 'circle-check' : 'circle-xmark';
  el.innerHTML = `<div class="alert alert-${type}"><i class="fas fa-${icon}"></i> ${msg}</div>`;
  if (timeout > 0) setTimeout(() => { el.innerHTML = ''; }, timeout);
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) btn.dataset.origText = btn.textContent;
  else         btn.textContent = btn.dataset.origText || btn.textContent;
}

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════════════════════

async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;

  if (!username || !password) {
    showAlert('loginAlert', 'Please enter username and password.', 'error');
    return;
  }

  try {
    // No token needed for login
    const res  = await fetch(`${API}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok || !data.token) {
      showAlert('loginAlert', data.error || 'Login failed.', 'error');
      return;
    }

    saveToken(data.token);
    await showAdminPanel();

  } catch {
    showAlert('loginAlert',
      'Cannot connect to server. Make sure the backend is running (npm start in /backend).',
      'error', 10000);
  }
}

function doLogout() {
  dropToken();
  _certs   = [];
  _courses = [];
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}

function togglePass() {
  const input = document.getElementById('loginPass');
  const icon  = document.getElementById('eyeIcon');
  const show  = input.type === 'password';
  input.type      = show ? 'text'         : 'password';
  icon.className  = show ? 'fas fa-eye-slash' : 'fas fa-eye';
}

// Load all data, then reveal the panel
async function showAdminPanel() {
  await Promise.all([ loadCerts(), loadCourses(), loadApps() ]);
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminPanel').classList.remove('hidden');
  renderCertsTable();
  renderCoursesTable();
  renderAppsTable();
  refreshDashboard();
  loadContent();
}

// ── Auto-login on page load if a valid token is already stored ────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Wire Enter key on login form
  ['loginUser', 'loginPass'].forEach(id => {
    document.getElementById(id)
      ?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });

  // Check stored token
  if (getToken()) {
    try {
      await apiFetch('GET', '/auth/me');  // throws if expired/invalid
      await showAdminPanel();
    } catch {
      dropToken(); // token bad — stay on login screen
    }
  }
});

// ── Navigation ────────────────────────────────────────────────────────────────
function showPage(name, btn) {
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${name}`)?.classList.add('active');
  if (btn) btn.classList.add('active');
  if (name === 'dashboard') refreshDashboard();
}

// ══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

function refreshDashboard() {
  const active  = _certs.filter(c => c.status === 'Active').length;
  const newApps = _apps.filter(a => a.status === 'New').length;
  document.getElementById('statCerts').textContent    = _certs.length;
  document.getElementById('statCourses').textContent  = _courses.length;
  document.getElementById('statActive').textContent   = active;
  document.getElementById('statApps').textContent     = newApps;

  // Red badge on sidebar nav item
  const badge = document.getElementById('appsBadge');
  if (badge) {
    badge.textContent    = newApps;
    badge.style.display  = newApps > 0 ? 'inline-block' : 'none';
  }

  const body   = document.getElementById('recentCertsBody');
  if (!body) return;

  const recent = [..._certs].reverse().slice(0, 5);
  if (!recent.length) {
    body.innerHTML = `
      <tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">
        No certificates yet.
      </td></tr>`;
    return;
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB') : '—';
  body.innerHTML = recent.map(c => `
    <tr>
      <td><code>${escHtml(c.certificateId)}</code></td>
      <td>${escHtml(c.studentName)}</td>
      <td>${escHtml(c.courseName)}</td>
      <td><span class="${c.status === 'Active' ? 'status-active' : 'status-pending'}">
        ${escHtml(c.status)}
      </span></td>
    </tr>`).join('');
}

// ══════════════════════════════════════════════════════════════════════════════
//  CERTIFICATE COURSE DROPDOWN
//  Always built from the live _courses cache so renaming a course
//  is reflected immediately when opening the cert modal.
// ══════════════════════════════════════════════════════════════════════════════

function populateCertCourseDropdown(selectedValue = '') {
  const select = document.getElementById('certCourse');
  if (!select) return;

  select.innerHTML = '<option value="">Select course…</option>';
  _courses.forEach(c => {
    const opt = document.createElement('option');
    opt.value       = c.courseName;
    opt.textContent = c.courseName;
    if (c.courseName === selectedValue) opt.selected = true;
    select.appendChild(opt);
  });

  // If the saved course no longer exists, keep it visible but labelled
  if (selectedValue && !_courses.find(c => c.courseName === selectedValue)) {
    const opt = document.createElement('option');
    opt.value       = selectedValue;
    opt.textContent = `${selectedValue} (renamed/deleted)`;
    opt.selected    = true;
    select.appendChild(opt);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  CERTIFICATES
// ══════════════════════════════════════════════════════════════════════════════

async function loadCerts() {
  try   { _certs = await apiFetch('GET', '/certificates'); }
  catch { _certs = []; }
}

// Client-side filter on the in-memory cache (instant, no spinner on search)
function renderCertsTable() {
  const query  = (document.getElementById('certSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('certStatusFilter')?.value || '';
  const body   = document.getElementById('certsBody');
  const noMsg  = document.getElementById('noDataMsg');
  if (!body) return;

  const filtered = _certs.filter(c => {
    const q = !query
      || c.certificateId.toLowerCase().includes(query)
      || c.studentName.toLowerCase().includes(query)
      || c.courseName.toLowerCase().includes(query);
    const s = !filter || c.status === filter;
    return q && s;
  });

  if (!filtered.length) {
    body.innerHTML = '';
    noMsg?.classList.remove('hidden');
    return;
  }
  noMsg?.classList.add('hidden');

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB') : '—';
  body.innerHTML = filtered.map(c => `
    <tr>
      <td><code style="font-size:0.85rem;">${escHtml(c.certificateId)}</code></td>
      <td>${escHtml(c.studentName)}</td>
      <td style="font-size:0.85rem;">${escHtml(c.courseName)}</td>
      <td style="font-size:0.82rem;color:var(--text-muted);">${fmtDate(c.issueDate)}</td>
      <td><span class="${c.status === 'Active' ? 'status-active' : 'status-pending'}">
        ${escHtml(c.status)}
      </span></td>
      <td>
        <div class="actions">
          <button class="btn-icon btn-edit"   title="Edit"
            onclick="editCert('${c._id}')"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" title="Delete"
            onclick="confirmDelete('cert','${c._id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function openCertModal(cert = null) {
  document.getElementById('certModalTitle').textContent = cert ? 'Edit Certificate' : 'Add Certificate';
  document.getElementById('certEditId').value = cert ? cert._id          : '';
  document.getElementById('certId').value     = cert ? cert.certificateId: '';
  document.getElementById('certName').value   = cert ? cert.studentName  : '';
  document.getElementById('certDate').value   = cert ? cert.issueDate    : new Date().toISOString().split('T')[0];
  document.getElementById('certStatus').value = cert ? cert.status       : 'Active';
  document.getElementById('certId').readOnly  = !!cert;
  document.getElementById('certModalAlert').innerHTML = '';
  populateCertCourseDropdown(cert ? cert.courseName : '');
  document.getElementById('certModal').classList.add('open');
}

function closeCertModal() {
  document.getElementById('certModal').classList.remove('open');
}

function editCert(id) {
  const cert = _certs.find(c => c._id === id);
  if (cert) openCertModal(cert);
}

async function saveCertificate() {
  const editId      = document.getElementById('certEditId').value;
  const certId      = document.getElementById('certId').value.trim().toUpperCase();
  const studentName = document.getElementById('certName').value.trim();
  const courseName  = document.getElementById('certCourse').value;
  const issueDate   = document.getElementById('certDate').value;
  const status      = document.getElementById('certStatus').value;

  if (!certId || !studentName || !courseName || !issueDate) {
    showAlert('certModalAlert', 'Please fill all required fields.', 'error');
    return;
  }

  const payload = { certificateId: certId, studentName, courseName, issueDate, status };

  try {
    if (editId) {
      // Edit existing — PUT /api/certificates/:id
      const updated = await apiFetch('PUT', `/certificates/${editId}`, payload);
      _certs = _certs.map(c => c._id === editId ? updated : c);
    } else {
      // Add new — POST /api/certificates
      const created = await apiFetch('POST', '/certificates', payload);
      _certs.push(created);
    }
    closeCertModal();
    renderCertsTable();
    refreshDashboard();
  } catch (e) {
    showAlert('certModalAlert', e.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  COURSES
// ══════════════════════════════════════════════════════════════════════════════

async function loadCourses() {
  try   { _courses = await apiFetch('GET', '/courses'); }
  catch { _courses = []; }
}

function renderCoursesTable() {
  const body  = document.getElementById('coursesBody');
  const noMsg = document.getElementById('noCourseMsg');
  if (!body) return;

  if (!_courses.length) {
    body.innerHTML = '';
    noMsg?.classList.remove('hidden');
    return;
  }
  noMsg?.classList.add('hidden');

  const fmt = p => p ? `LKR ${Number(p).toLocaleString()}` : '—';
  body.innerHTML = _courses.map(c => `
    <tr>
      <td>
        <strong>${escHtml(c.courseName)}</strong><br>
        <span style="font-size:0.8rem;color:var(--text-muted);">${escHtml(c.description || '')}</span>
      </td>
      <td style="font-size:0.9rem;">${fmt(c.originalPrice)}</td>
      <td style="font-size:0.9rem;color:var(--teal);font-weight:600;">${fmt(c.offerPrice)}</td>
      <td><span class="${c.status === 'Active' ? 'status-active' : 'status-pending'}">
        ${escHtml(c.status)}
      </span></td>
      <td>
        <div class="actions">
          <button class="btn-icon btn-edit"   title="Edit"
            onclick="editCourse('${c._id}')"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-delete" title="Delete"
            onclick="confirmDelete('course','${c._id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function openCourseModal(course = null) {
  document.getElementById('courseModalTitle').textContent = course ? 'Edit Course' : 'Add Course';
  document.getElementById('courseEditId').value  = course ? course._id           : '';
  document.getElementById('courseName').value    = course ? course.courseName    : '';
  document.getElementById('courseDesc').value    = course ? course.description   : '';
  document.getElementById('coursePrice').value   = course ? course.originalPrice : '';
  document.getElementById('courseOffer').value   = course ? (course.offerPrice || '') : '';
  document.getElementById('courseStatus').value  = course ? course.status        : 'Active';
  document.getElementById('courseModalAlert').innerHTML = '';
  document.getElementById('courseModal').classList.add('open');
}

function closeCourseModal() {
  document.getElementById('courseModal').classList.remove('open');
}

function editCourse(id) {
  const course = _courses.find(c => c._id === id);
  if (course) openCourseModal(course);
}

async function saveCourse() {
  const editId        = document.getElementById('courseEditId').value;
  const courseName    = document.getElementById('courseName').value.trim();
  const description   = document.getElementById('courseDesc').value.trim();
  const originalPrice = document.getElementById('coursePrice').value;
  const offerPrice    = document.getElementById('courseOffer').value;
  const status        = document.getElementById('courseStatus').value;

  if (!courseName || !originalPrice) {
    showAlert('courseModalAlert', 'Course name and price are required.', 'error');
    return;
  }

  const payload = {
    courseName,
    description,
    originalPrice: Number(originalPrice),
    offerPrice:    offerPrice ? Number(offerPrice) : null,
    status
  };

  try {
    if (editId) {
      // Edit — PUT /api/courses/:id
      const updated = await apiFetch('PUT', `/courses/${editId}`, payload);
      _courses = _courses.map(c => c._id === editId ? updated : c);
    } else {
      // Add — POST /api/courses
      const created = await apiFetch('POST', '/courses', payload);
      _courses.push(created);
    }
    closeCourseModal();
    renderCoursesTable();
    refreshDashboard();
    populateCertCourseDropdown(); // ← keeps cert dropdown in sync immediately
  } catch (e) {
    showAlert('courseModalAlert', e.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  CONTENT & SETTINGS
//  The admin panel has one "Content" form that saves to both:
//    PUT /api/content  (hero text, social links)
//    PUT /api/settings (WhatsApp number)
// ══════════════════════════════════════════════════════════════════════════════

async function loadContent() {
  try {
    const [content, settings] = await Promise.all([
      apiFetch('GET', '/content'),
      apiFetch('GET', '/settings')
    ]);
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('heroHeadline', content.heroTitle);
    set('heroSubline',  content.heroDesc);
    set('waNumber',     settings.whatsappNumber);
    set('fbUrl',        content.fbUrl);
    set('igUrl',        content.igUrl);
    set('liUrl',        content.liUrl);
  } catch (e) {
    console.error('loadContent failed:', e.message);
  }
}

async function saveContent() {
  const val = id => document.getElementById(id)?.value || '';

  try {
    await Promise.all([
      apiFetch('PUT', '/content', {
        heroTitle: val('heroHeadline'),
        heroDesc:  val('heroSubline'),
        fbUrl:     val('fbUrl'),
        igUrl:     val('igUrl'),
        liUrl:     val('liUrl')
      }),
      apiFetch('PUT', '/settings', {
        whatsappNumber: val('waNumber')
      })
    ]);
    showAlert('contentSaveAlert', 'Content saved successfully!', 'success');
  } catch (e) {
    showAlert('contentSaveAlert', e.message || 'Save failed.', 'error');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PASSWORD CHANGE
// ══════════════════════════════════════════════════════════════════════════════

async function changePassword() {
  const cur = document.getElementById('curPass').value;
  const nw  = document.getElementById('newPass').value;

  if (nw.length < 8) {
    showAlert('pwAlert', 'New password must be at least 8 characters.', 'error');
    return;
  }

  try {
    await apiFetch('POST', '/auth/change-password', {
      currentPassword: cur,
      newPassword:     nw
    });
    document.getElementById('curPass').value = '';
    document.getElementById('newPass').value = '';
    showAlert('pwAlert', 'Password updated! Edit backend/.env to make it permanent.', 'success');
  } catch (e) {
    showAlert('pwAlert', e.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  DELETE / CONFIRM
// ══════════════════════════════════════════════════════════════════════════════

let _pendingDelete = null;

function confirmDelete(type, id) {
  _pendingDelete = { type, id };
  const label = type === 'cert' ? 'certificate' : type === 'app' ? 'application' : 'course';
  document.getElementById('confirmMsg').textContent =
    `Are you sure you want to delete this ${label}? This cannot be undone.`;
  document.getElementById('confirmModal').classList.add('open');
  document.getElementById('confirmYes').onclick = executeDelete;
}

async function executeDelete() {
  if (!_pendingDelete) return;
  const { type, id } = _pendingDelete;

  try {
    if (type === 'cert') {
      await apiFetch('DELETE', `/certificates/${id}`);
      _certs = _certs.filter(c => c._id !== id);
      renderCertsTable();
    } else if (type === 'app') {
      await apiFetch('DELETE', `/applications/${id}`);
      _apps = _apps.filter(a => a._id !== id);
      renderAppsTable();
    } else {
      await apiFetch('DELETE', `/courses/${id}`);
      _courses = _courses.filter(c => c._id !== id);
      renderCoursesTable();
      populateCertCourseDropdown(); // keep cert dropdown in sync after delete
    }
    refreshDashboard();
  } catch (e) {
    alert('Delete failed: ' + e.message);
  }
  closeConfirm();
}

function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('open');
  _pendingDelete = null;
}

// Close any modal when clicking its backdrop
['certModal', 'courseModal', 'confirmModal'].forEach(id => {
  document.getElementById(id)
    ?.addEventListener('click', e => { if (e.target.id === id) e.target.classList.remove('open'); });
});

// ══════════════════════════════════════════════════════════════════════════════
//  APPLICATIONS
// ══════════════════════════════════════════════════════════════════════════════

async function loadApps() {
  try   { _apps = await apiFetch('GET', '/applications'); }
  catch { _apps = []; }
}

function renderAppsTable() {
  const query  = (document.getElementById('appSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('appStatusFilter')?.value || '';
  const body   = document.getElementById('appsBody');
  const noMsg  = document.getElementById('noAppsMsg');
  if (!body) return;

  const filtered = _apps.filter(a => {
    const q = !query
      || a.fullName.toLowerCase().includes(query)
      || a.email.toLowerCase().includes(query)
      || a.courseType.toLowerCase().includes(query);
    const s = !filter || a.status === filter;
    return q && s;
  });

  // Sort newest first
  filtered.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  if (!filtered.length) {
    body.innerHTML = '';
    noMsg?.classList.remove('hidden');
    return;
  }
  noMsg?.classList.add('hidden');

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

  const statusColors = {
    'New':       'background:#fee2e2;color:#dc2626;',
    'Reviewed':  'background:#fef9c3;color:#ca8a04;',
    'Contacted': 'background:#dbeafe;color:#2563eb;',
    'Enrolled':  'background:#dcfce7;color:#16a34a;',
    'Rejected':  'background:#f1f5f9;color:#64748b;'
  };

  body.innerHTML = filtered.map(a => `
    <tr>
      <td>
        <strong style="font-size:0.9rem;">${escHtml(a.fullName)}</strong>
        ${a.notes ? `<br><span style="font-size:0.76rem;color:var(--text-muted);">${escHtml(a.notes.slice(0,60))}${a.notes.length>60?'…':''}</span>` : ''}
      </td>
      <td style="font-size:0.82rem;">${escHtml(a.courseType)}</td>
      <td style="font-size:0.82rem;">
        <div>${escHtml(a.phone)}</div>
        <div style="color:var(--text-muted);">${escHtml(a.email)}</div>
        ${a.driveLink ? `<a href="${escHtml(a.driveLink)}" target="_blank" style="font-size:0.76rem;color:var(--teal);"><i class="fas fa-folder-open"></i> Drive</a>` : ''}
      </td>
      <td style="font-size:0.82rem;">${escHtml(a.paymentMethod)}</td>
      <td style="font-size:0.8rem;color:var(--text-muted);">${fmtDate(a.submittedAt)}</td>
      <td>
        <select style="padding:5px 8px;border:1.5px solid var(--soft-gray);border-radius:6px;font-size:0.78rem;font-family:inherit;${statusColors[a.status]||''}"
          onchange="updateAppStatus('${a._id}', this.value)">
          <option value="New"       ${a.status==='New'       ?'selected':''}>New</option>
          <option value="Reviewed"  ${a.status==='Reviewed'  ?'selected':''}>Reviewed</option>
          <option value="Contacted" ${a.status==='Contacted' ?'selected':''}>Contacted</option>
          <option value="Enrolled"  ${a.status==='Enrolled'  ?'selected':''}>Enrolled</option>
          <option value="Rejected"  ${a.status==='Rejected'  ?'selected':''}>Rejected</option>
        </select>
      </td>
      <td>
        <button class="btn-icon btn-delete" title="Delete"
          onclick="confirmDelete('app','${a._id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

async function updateAppStatus(id, status) {
  try {
    const updated = await apiFetch('PATCH', `/applications/${id}/status`, { status });
    _apps = _apps.map(a => a._id === id ? updated : a);
    refreshDashboard();
  } catch (e) {
    alert('Failed to update status: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  CLEAR ALL DATA
//  Data now lives on the backend server (backend/data/*.json).
//  This button clears the local in-memory cache and re-renders the UI;
//  it does NOT delete backend records. To wipe backend data, delete the
//  JSON files in backend/data/ and restart the server.
// ══════════════════════════════════════════════════════════════════════════════

function clearAllData() {
  document.getElementById('confirmMsg').textContent =
    'Are you sure you want to clear the local display cache? ' +
    'This refreshes the page. Backend data is NOT deleted.';
  document.getElementById('confirmModal').classList.add('open');
  document.getElementById('confirmYes').onclick = async () => {
    closeConfirm();
    // Reload fresh data from the backend
    await Promise.all([ loadCerts(), loadCourses() ]);
    renderCertsTable();
    renderCoursesTable();
    refreshDashboard();
    await loadContent();
    showAlert('contentSaveAlert', 'Data refreshed from server.', 'success');
  };
}
