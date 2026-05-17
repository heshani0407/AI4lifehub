const router  = require('express').Router();
const { v4: uuid } = require('uuid');
const protect = require('../middleware/auth');
const { readDB, writeDB } = require('../db');

const COL = 'courses';

// ── GET /api/courses — PUBLIC (main website reads course listings) ─────────
router.get('/', (_req, res) => res.json(readDB(COL)));

// ── GET /api/courses/:id — PUBLIC ─────────────────────────────────────────
router.get('/:id', (req, res) => {
  const course = readDB(COL).find(c => c._id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

// ── POST /api/courses — PROTECTED ─────────────────────────────────────────
router.post('/', protect, (req, res) => {
  const {
    courseName, description, sessions, features,
    originalPrice, offerPrice, offerLabel,
    paymentOptions, status
  } = req.body;

  if (!courseName || !originalPrice) {
    return res.status(400).json({ error: 'courseName and originalPrice are required' });
  }

  const courses = readDB(COL);
  const newCourse = {
    _id:            uuid(),
    courseName:     courseName.trim(),
    description:    description   || '',
    sessions:       Number(sessions) || 0,
    features:       Array.isArray(features) ? features : [],
    originalPrice:  Number(originalPrice),
    offerPrice:     offerPrice ? Number(offerPrice) : null,
    offerLabel:     offerLabel    || '',
    paymentOptions: paymentOptions || ['full'],
    status:         status        || 'Active',
    createdAt:      new Date().toISOString()
  };

  courses.push(newCourse);
  writeDB(COL, courses);
  res.status(201).json(newCourse);
});

// ── PUT /api/courses/:id — PROTECTED ──────────────────────────────────────
router.put('/:id', protect, (req, res) => {
  let courses = readDB(COL);
  const idx = courses.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Course not found' });

  courses[idx] = {
    ...courses[idx],
    ...req.body,
    _id:       courses[idx]._id,
    createdAt: courses[idx].createdAt,
    updatedAt: new Date().toISOString()
  };
  writeDB(COL, courses);
  res.json(courses[idx]);
});

// ── PATCH /api/courses/:id/toggle — PROTECTED — toggle Active ↔ Coming Soon
router.patch('/:id/toggle', protect, (req, res) => {
  let courses = readDB(COL);
  const idx = courses.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Course not found' });

  courses[idx].status    = courses[idx].status === 'Active' ? 'Coming Soon' : 'Active';
  courses[idx].updatedAt = new Date().toISOString();
  writeDB(COL, courses);
  res.json(courses[idx]);
});

// ── DELETE /api/courses/:id — PROTECTED ───────────────────────────────────
router.delete('/:id', protect, (req, res) => {
  let courses = readDB(COL);
  const idx = courses.findIndex(c => c._id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Course not found' });

  courses.splice(idx, 1);
  writeDB(COL, courses);
  res.json({ message: 'Course deleted successfully' });
});

module.exports = router;
