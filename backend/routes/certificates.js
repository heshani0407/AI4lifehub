const router  = require('express').Router();
const { v4: uuid } = require('uuid');
const protect = require('../middleware/auth');
const { readDB, writeDB } = require('../db');

const COL = 'certificates';

// All certificate routes require admin login
router.use(protect);

// ── GET /api/certificates ─────────────────────────────────────────────────────
// Optional query params: ?q=searchTerm  ?status=Active|Revoked
router.get('/', (req, res) => {
  let certs = readDB(COL);
  const { q, status } = req.query;

  if (q) {
    const s = q.toLowerCase();
    certs = certs.filter(c =>
      c.certificateId?.toLowerCase().includes(s) ||
      c.studentName?.toLowerCase().includes(s)   ||
      c.courseName?.toLowerCase().includes(s)
    );
  }
  if (status) certs = certs.filter(c => c.status === status);

  res.json(certs);
});

// ── GET /api/certificates/:id ─────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const cert = readDB(COL).find(c => c._id === req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  res.json(cert);
});

// ── POST /api/certificates ────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { certificateId, studentName, courseName, issueDate, status, notes } = req.body;

  if (!certificateId || !studentName || !courseName) {
    return res.status(400).json({ error: 'certificateId, studentName and courseName are required' });
  }

  const certs = readDB(COL);
  const idUpper = certificateId.trim().toUpperCase();

  // Duplicate certificate ID check (case-insensitive)
  if (certs.find(c => c.certificateId === idUpper)) {
    return res.status(409).json({ error: 'A certificate with this ID already exists' });
  }

  const newCert = {
    _id: uuid(),
    certificateId: idUpper,
    studentName:   studentName.trim(),
    courseName:    courseName.trim(),
    issueDate:     issueDate || new Date().toISOString().split('T')[0],
    status:        status || 'Active',
    notes:         notes  || '',
    createdAt:     new Date().toISOString()
  };

  certs.push(newCert);
  writeDB(COL, certs);
  res.status(201).json(newCert);
});

// ── PUT /api/certificates/:id ─────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  let certs = readDB(COL);
  const idx = certs.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Certificate not found' });

  // Protect _id and createdAt from being overwritten
  certs[idx] = {
    ...certs[idx],
    ...req.body,
    _id:       certs[idx]._id,
    createdAt: certs[idx].createdAt,
    // Always store cert ID in uppercase
    certificateId: (req.body.certificateId || certs[idx].certificateId).trim().toUpperCase(),
    updatedAt: new Date().toISOString()
  };

  writeDB(COL, certs);
  res.json(certs[idx]);
});

// ── DELETE /api/certificates/:id ──────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  let certs = readDB(COL);
  const idx = certs.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Certificate not found' });

  certs.splice(idx, 1);
  writeDB(COL, certs);
  res.json({ message: 'Certificate deleted successfully' });
});

module.exports = router;
