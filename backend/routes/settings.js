const router  = require('express').Router();
const protect = require('../middleware/auth');
const { readDB, writeDB } = require('../db');

const COL = 'settings';

// ── GET /api/settings — PUBLIC (main website reads WhatsApp number) ────────
router.get('/', (_req, res) => res.json(readDB(COL)));

// ── PUT /api/settings — PROTECTED ─────────────────────────────────────────
router.put('/', protect, (req, res) => {
  const current = readDB(COL);
  const updated = { ...current, ...req.body, updatedAt: new Date().toISOString() };
  writeDB(COL, updated);
  res.json(updated);
});

module.exports = router;
