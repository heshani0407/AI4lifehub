/**
 * db.js — Simple JSON file database helper
 * Drop-in: swap readDB / writeDB for Mongoose calls when moving to MongoDB.
 */
const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Auto-create /data directory on first require
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Seed defaults (written once when the JSON file does not yet exist) ────────
const DEFAULTS = {
  applications: [],

  certificates: [],

  courses: [
    {
      _id: '1',
      courseName: 'AI Literacy — Foundation Course for Non-Tech Professionals',
      description: 'For Non-Tech Professionals',
      sessions: 6,
      features: [
        '100% practical learning',
        'No coding required',
        'Real-world AI applications',
        'Flexible payment options',
        'WhatsApp support included'
      ],
      originalPrice: 15000,
      offerPrice: 10000,
      offerLabel: 'Early Bird Offer',
      paymentOptions: ['full', 'installment'],
      status: 'Active',
      createdAt: new Date().toISOString()
    }
  ],

  content: {
    heroTitle:      'AI for Your Career — Without the Tech Confusion',
    heroDesc:       'We teach AI to professionals, students, and entrepreneurs in Sri Lanka — step by step, without needing a technical background.',
    heroBadge:      'New Batch Starting Soon',
    ctaText:        'Enroll via WhatsApp',
    ctaSecondary:   'View Courses',
    stat1:          '500+ Students',
    stat2:          '10+ Courses',
    stat3:          '95% Satisfaction',
    aboutText:      'AI for Life Learning is Sri Lanka\'s premier practical AI education platform.',
    footerTagline:  'Empowering non-tech professionals to use AI tools in real life.',
    email:          ''
  },

  settings: {
    whatsappNumber:  '',
    whatsappMessage: "Hi, I'm interested in enrolling in the AI for Life course. Please share details.",
    businessHours:   'Mon – Fri, 9 AM – 6 PM',
    responseTime:    'Usually within 1 hour'
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function filePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readDB(collection) {
  const fp = filePath(collection);
  if (!fs.existsSync(fp)) {
    const seed = DEFAULTS[collection] ?? (Array.isArray(DEFAULTS[collection]) ? [] : {});
    fs.writeFileSync(fp, JSON.stringify(seed, null, 2));
    return seed;
  }
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return DEFAULTS[collection] ?? [];
  }
}

function writeDB(collection, data) {
  fs.writeFileSync(filePath(collection), JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };
