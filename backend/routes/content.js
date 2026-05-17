const router  = require('express').Router();
const protect = require('../middleware/auth');
const { readDB, writeDB } = require('../db');

const COL = 'content';

// ── GET /api/content — PUBLIC (main website reads hero text, stats etc.) ──
router.get('/', (_req, res) => res.json(readDB(COL)));

// ── PUT /api/content — PROTECTED ──────────────────────────────────────────
router.put('/', protect, (req, res) => {
  const current = readDB(COL);
  const updated = { ...current, ...req.body, updatedAt: new Date().toISOString() };
  writeDB(COL, updated);
  res.json(updated);
});

module.exports = router;
