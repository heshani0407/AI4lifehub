require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// ── Ensure uploads directory exists ──────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Middleware ────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5500',   // VS Code Live Server
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

app.use(cors({
  // Allow any localhost/127 port plus file:// pages (origin header = "null")
  origin: (origin, cb) => {
    if (
      !origin ||                             // same-origin or server-to-server
      origin === 'null' ||                   // file:// opened directly in browser
      ALLOWED_ORIGINS.includes(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Serve uploaded files ──────────────────────────────────────────────────────
app.use('/uploads', express.static(uploadsDir));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/courses',      require('./routes/courses'));
app.use('/api/content',      require('./routes/content'));
app.use('/api/settings',     require('./routes/settings'));
app.use('/api/media',        require('./routes/media'));

// Public POST (website form) — protected GET (admin)
app.use('/api/applications', require('./routes/applications'));

// Public — no auth required (used by verify.html on the main website)
app.use('/api/verify',       require('./routes/verify'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅  AI4Life backend running → http://localhost:${PORT}`);
  console.log(`    Health check            → http://localhost:${PORT}/api/health`);
});
