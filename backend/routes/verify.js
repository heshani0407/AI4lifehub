/**
 * PUBLIC endpoint — no auth required.
 * Called by verify.html on the main website to check a certificate.
 */
const router = require('express').Router();
const { readDB } = require('../db');

// ── GET /api/verify/:certificateId ────────────────────────────────────────────
router.get('/:certificateId', (req, res) => {
  const certs = readDB('certificates');
  const cert  = certs.find(
    c => c.certificateId.toUpperCase() === req.params.certificateId.toUpperCase()
  );

  if (!cert) {
    return res.status(404).json({
      found: false,
      error: 'Certificate not found'
    });
  }

  // Return only safe public fields — never expose internal _id or admin notes
  res.json({
    found:         true,
    certificateId: cert.certificateId,
    name:          cert.studentName,
    course:        cert.courseName,
    issueDate:     cert.issueDate,
    status:        cert.status
  });
});

module.exports = router;
