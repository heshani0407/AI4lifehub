const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const protect = require('../middleware/auth');

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    // Shape: { token, admin } — must match what the frontend AuthContext expects
    return res.json({ token, admin: { username, role: 'admin' } });
  }

  res.status(401).json({ error: 'Invalid username or password' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// Verify token is still valid; used by frontend on page refresh
router.get('/me', protect, (req, res) => {
  res.json({ username: req.admin.username, role: req.admin.role });
});

// ── POST /api/auth/change-password ────────────────────────────────────────────
router.post('/change-password', protect, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new password are required' });
  }
  if (currentPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  // Updates in-memory for this session.
  // To make permanent: edit ADMIN_PASSWORD in backend/.env and restart.
  process.env.ADMIN_PASSWORD = newPassword;
  res.json({ message: 'Password updated. Edit .env to make it permanent after restart.' });
});

module.exports = router;
