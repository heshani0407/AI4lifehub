const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const protect = require('../middleware/auth');

// ── Multer storage config ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = file.fieldname === 'logo' ? 'logo' : 'hero-statue';
    cb(null, `${name}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  }
});

router.use(protect);

// ── POST /api/media/logo ──────────────────────────────────────────────────────
router.post('/logo', upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    url:      `/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

// ── POST /api/media/hero ──────────────────────────────────────────────────────
router.post('/hero', upload.single('hero'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    url:      `/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

module.exports = router;
