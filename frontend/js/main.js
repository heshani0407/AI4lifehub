// ══════════════════════════════════════════════════════════════════════════════
//  main.js — AI4Life Public Website
//  UI interactions + live data from backend (WhatsApp number, content)
// ══════════════════════════════════════════════════════════════════════════════

// Use var so admin.js (also loaded on admin.html) can declare the same name without a SyntaxError
var API = 'https://ai4lifehub-production.up.railway.app/api';

// ── Navbar scroll effect ───────────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ── Mobile menu toggle ─────────────────────────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileMenu   = document.getElementById('mobileMenu');
if (hamburgerBtn && mobileMenu) {
  hamburgerBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!hamburgerBtn.contains(e.target) && !mobileMenu.contains(e.target))
      mobileMenu.classList.remove('open');
  });
  mobileMenu.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', () => mobileMenu.classList.remove('open'))
  );
}

// ── Active nav link on scroll ──────────────────────────────────────────────────
const sections = document.querySelectorAll('section[id], div[id="home"]');
const navLinks  = document.querySelectorAll('.nav-links a');
if (sections.length && navLinks.length) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a =>
          a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`)
        );
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(s => observer.observe(s));
}

// ── Smooth-scroll for anchor links ─────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ── Fade-in on scroll ──────────────────────────────────────────────────────────
const animEls = document.querySelectorAll(
  '.card, .feature-item, .step-item, .cert-card, .course-main-card, .pricing-card, .coming-card'
);
if (animEls.length) {
  const fadeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity   = '1';
        entry.target.style.transform = 'translateY(0)';
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  animEls.forEach(el => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(24px)';
    el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    fadeObserver.observe(el);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  BACKEND WIRING — WhatsApp links + Hero content
//  Runs once on page load. Falls back silently if backend is offline.
// ══════════════════════════════════════════════════════════════════════════════

async function loadSiteData() {
  try {
    // Fetch settings and content in parallel
    const [settings, content] = await Promise.all([
      fetch(`${API}/settings`).then(r => r.json()),
      fetch(`${API}/content`).then(r => r.json())
    ]);

    // ── 1. Update every WhatsApp enroll button dynamically ─────────────────
    const rawNumber = (settings.whatsappNumber || '').replace(/\D/g, ''); // digits only
    const message   = encodeURIComponent(
      settings.whatsappMessage || "Hi, I'm interested in enrolling in the AI for Life course. Please share details."
    );

    if (rawNumber) {
      const waUrl = `https://wa.me/${rawNumber}?text=${message}`;
      // Targets every element with class btn-whatsapp or the data-wa attribute
      document.querySelectorAll('.btn-whatsapp, [data-wa-link]').forEach(el => {
        el.href = waUrl;
      });
    }

    // ── 2. Update hero section text if set in admin ────────────────────────
    if (content.heroTitle) {
      const heroTitle = document.querySelector('.hero-title');
      if (heroTitle) heroTitle.innerHTML = content.heroTitle;
    }
    if (content.heroDesc) {
      const heroDesc = document.querySelector('.hero-desc');
      if (heroDesc) heroDesc.textContent = content.heroDesc;
    }
    if (content.heroBadge) {
      const badge = document.querySelector('.hero-badge');
      // Keep the dot span, only replace the text node
      if (badge) {
        const dot = badge.querySelector('.hero-badge-dot');
        badge.textContent = ' ' + content.heroBadge;
        if (dot) badge.prepend(dot);
      }
    }

    // ── 3. Update stats bar ────────────────────────────────────────────────
    const statEls = document.querySelectorAll('.hero-stat-num');
    const stats   = [content.stat1, content.stat2, content.stat3].filter(Boolean);
    statEls.forEach((el, i) => { if (stats[i]) el.textContent = stats[i]; });

  } catch {
    // Backend offline — page displays its hardcoded HTML as-is, no errors shown
  }
}

// Run on page load
loadSiteData();

// ══════════════════════════════════════════════════════════════════════════════
//  APPLICATION MODAL
// ══════════════════════════════════════════════════════════════════════════════

function openApplyModal() {
  const modal = document.getElementById('applyModal');
  if (!modal) return;
  // Reset to form view each time it opens
  document.getElementById('applyFormView')?.classList.remove('hidden');
  document.getElementById('applySuccessView')?.classList.add('hidden');
  document.getElementById('applyForm')?.reset();
  document.getElementById('applyAlert').innerHTML = '';
  populateApplyCourseDropdown();
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeApplyModal() {
  const modal = document.getElementById('applyModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('applyModal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeApplyModal();
    });
  }
  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeApplyModal();
  });
});

// Populate course dropdown from live backend courses
// Falls back to the hardcoded option already in the HTML if the backend is unreachable
async function populateApplyCourseDropdown() {
  const sel = document.getElementById('applyCourse');
  if (!sel) return;
  try {
    const courses = await fetch(`${API}/courses`).then(r => r.json());
    const active  = courses.filter(c => c.status === 'Active');
    if (!active.length) return; // keep the hardcoded fallback option
    sel.innerHTML = '<option value="">Select a course…</option>';
    active.forEach(c => {
      const opt = document.createElement('option');
      opt.value       = c.courseName;
      opt.textContent = c.courseName;
      sel.appendChild(opt);
    });
  } catch {
    // Backend offline — the hardcoded HTML option stays in place as fallback
  }
}

async function submitApplication(e) {
  e.preventDefault();
  const alertBox = document.getElementById('applyAlert');
  const btn      = document.getElementById('applySubmitBtn');

  const fullName     = document.getElementById('applyName').value.trim();
  const courseType   = document.getElementById('applyCourse').value;
  const phone        = document.getElementById('applyPhone').value.trim();
  const email        = document.getElementById('applyEmail').value.trim();
  const paymentMethod= document.getElementById('applyPayment').value;
  const driveLink    = document.getElementById('applyDrive').value.trim();
  const notes        = document.getElementById('applyNotes').value.trim();

  // Client-side validation
  if (!fullName || !courseType || !phone || !email || !paymentMethod) {
    alertBox.innerHTML = `<div class="alert alert-error" style="margin-bottom:14px;">
      <i class="fas fa-circle-xmark"></i> Please fill in all required fields.
    </div>`;
    return;
  }

  btn.disabled     = true;
  btn.innerHTML    = '<i class="fas fa-spinner fa-spin"></i> Submitting…';
  alertBox.innerHTML = '';

  try {
    const res  = await fetch(`${API}/applications`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fullName, courseType, paymentMethod, phone, email, driveLink, notes })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Submission failed.');

    // Show success view
    document.getElementById('applyFormView').classList.add('hidden');
    document.getElementById('applySuccessView').classList.remove('hidden');

  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error" style="margin-bottom:14px;">
      <i class="fas fa-circle-xmark"></i> ${err.message || 'Something went wrong. Please try again.'}
    </div>`;
    btn.disabled  = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
  }
}
