const router  = require('express').Router();
const { v4: uuid } = require('uuid');
const protect = require('../middleware/auth');
const { readDB, writeDB } = require('../db');

const COL = 'applications';

// ── POST /api/applications — PUBLIC (website submission form) ─────────────────
router.post('/', (req, res) => {
  const { fullName, courseType, paymentMethod, phone, email, driveLink, notes } = req.body;

  if (!fullName || !courseType || !paymentMethod || !phone || !email) {
    return res.status(400).json({ error: 'Full name, course, payment method, phone and email are required.' });
  }

  const apps = readDB(COL);
  const newApp = {
    _id:           uuid(),
    fullName:      fullName.trim(),
    courseType:    courseType.trim(),
    paymentMethod: paymentMethod.trim(),
    phone:         phone.trim(),
    email:         email.trim(),
    driveLink:     (driveLink || '').trim(),
    notes:         (notes || '').trim(),
    status:        'New',           // New | Reviewed | Contacted | Enrolled | Rejected
    submittedAt:   new Date().toISOString()
  };

  apps.push(newApp);
  writeDB(COL, apps);

  res.status(201).json({ success: true, id: newApp._id });
});

// ── GET /api/applications — PROTECTED (admin only) ────────────────────────────
router.get('/', protect, (_req, res) => {
  res.json(readDB(COL));
});

// ── PATCH /api/applications/:id/status — PROTECTED ───────────────────────────
router.patch('/:id/status', protect, (req, res) => {
  const apps    = readDB(COL);
  const idx     = apps.findIndex(a => a._id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Application not found' });

  apps[idx].status    = req.body.status || apps[idx].status;
  apps[idx].updatedAt = new Date().toISOString();
  writeDB(COL, apps);
  res.json(apps[idx]);
});

// ── DELETE /api/applications/:id — PROTECTED ─────────────────────────────────
router.delete('/:id', protect, (req, res) => {
  const apps    = readDB(COL);
  const updated = apps.filter(a => a._id !== req.params.id);
  if (updated.length === apps.length) return res.status(404).json({ error: 'Application not found' });
  writeDB(COL, updated);
  res.json({ success: true });
});

module.exports = router;
