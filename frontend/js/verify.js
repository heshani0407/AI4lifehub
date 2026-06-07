// ── Config ────────────────────────────────────────────────────────────────────
const API = 'https://ai4lifehub-production.up.railway.app/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Certificate Verification ──────────────────────────────────────────────────
async function verifyCertificate() {
  const input    = document.getElementById('certIdInput');
  const result   = document.getElementById('certResult');
  const alertBox = document.getElementById('alertBox');

  const query = (input?.value || '').trim().toUpperCase();
  if (alertBox) alertBox.innerHTML = '';
  if (result)   result.innerHTML   = '';

  if (!query) {
    if (alertBox) alertBox.innerHTML = `
      <div class="alert alert-error">
        <i class="fas fa-exclamation-circle"></i> Please enter a Certificate ID.
      </div>`;
    return;
  }

  // Show loading spinner while fetching
  if (result) result.innerHTML = `
    <div style="text-align:center;padding:40px;color:var(--text-muted);">
      <i class="fas fa-spinner fa-spin fa-2x"></i>
      <p style="margin-top:12px;font-size:0.9rem;">Verifying certificate…</p>
    </div>`;

  try {
    const res  = await fetch(`${API}/verify/${encodeURIComponent(query)}`);
    const data = await res.json();

    // ── Not found ─────────────────────────────────────────────────────────────
    if (!data.found) {
      result.innerHTML = `
        <div class="cert-not-found">
          <div class="icon"><i class="fas fa-circle-xmark"></i></div>
          <h4 style="margin-bottom:8px;">Certificate Not Found</h4>
          <p>No certificate found with ID <strong>${escHtml(query)}</strong>.</p>
          <p style="margin-top:8px;font-size:0.82rem;">
            Please check the ID and try again, or contact us via WhatsApp.
          </p>
        </div>`;
      return;
    }

    // ── Found ─────────────────────────────────────────────────────────────────
    // Backend returns: { found, certificateId, name, course, issueDate, status }
    const statusClass = data.status === 'Active' ? 'status-active' : 'status-pending';
    const statusIcon  = data.status === 'Active' ? 'fa-circle-check' : 'fa-clock';
    const formattedDate = data.issueDate
      ? new Date(data.issueDate).toLocaleDateString('en-GB', {
          year: 'numeric', month: 'long', day: 'numeric'
        })
      : '—';

    result.innerHTML = `
      <div class="cert-result-card">
        <div class="cert-result-header">
          <div class="cert-result-icon"><i class="fas fa-certificate"></i></div>
          <div>
            <h4>${escHtml(data.name)}</h4>
            <p>${escHtml(data.course)}</p>
          </div>
        </div>
        <div class="cert-result-body">
          <div class="cert-detail-row">
            <span class="cert-detail-label">Certificate ID</span>
            <span class="cert-detail-value">${escHtml(data.certificateId)}</span>
          </div>
          <div class="cert-detail-row">
            <span class="cert-detail-label">Student Name</span>
            <span class="cert-detail-value">${escHtml(data.name)}</span>
          </div>
          <div class="cert-detail-row">
            <span class="cert-detail-label">Course</span>
            <span class="cert-detail-value">${escHtml(data.course)}</span>
          </div>
          <div class="cert-detail-row">
            <span class="cert-detail-label">Issue Date</span>
            <span class="cert-detail-value">${formattedDate}</span>
          </div>
          <div class="cert-detail-row">
            <span class="cert-detail-label">Status</span>
            <span class="cert-detail-value">
              <span class="${statusClass}">
                <i class="fas ${statusIcon}"></i> ${escHtml(data.status)}
              </span>
            </span>
          </div>
        </div>
      </div>`;

  } catch (e) {
    // Backend unreachable
    result.innerHTML = `
      <div class="cert-not-found">
        <div class="icon"><i class="fas fa-triangle-exclamation"></i></div>
        <h4>Connection Error</h4>
        <p>Could not reach the verification server. Please try again later.</p>
      </div>`;
  }
}

// ── On page load ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Enter key triggers verify
  const input = document.getElementById('certIdInput');
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') verifyCertificate();
    });
  }

  // Pre-fill from URL: verify.html?id=AL-2024-001
  const params  = new URLSearchParams(window.location.search);
  const idParam = params.get('id');
  if (idParam && input) {
    input.value = idParam;
    verifyCertificate();
  }
});
