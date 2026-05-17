const jwt = require('jsonwebtoken');

/**
 * protect — JWT middleware
 * Attach to any route that requires admin login.
 * Sets req.admin = decoded token payload on success.
 */
module.exports = function protect(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided — please log in' });
  }

  const token = header.split(' ')[1];

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired — please log in again'
      : 'Invalid token — please log in';
    res.status(401).json({ error: msg });
  }
};
