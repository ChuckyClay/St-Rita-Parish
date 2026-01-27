const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const ANNOUNCEMENTS_FILE = path.join(__dirname, 'announcements.json');

// Helper: Read announcements from file
function readAnnouncements() {
  try {
    const data = fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Helper: Write announcements to file
function writeAnnouncements(data) {
  fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(data, null, 2));
}

// Get all announcements
router.get('/', (req, res) => {
  res.json(readAnnouncements());
});

// Add a new announcement with validation
router.post(
  '/',
  [
    body('title').isString().trim().notEmpty().withMessage('Title is required.'),
    body('content').isString().trim().notEmpty().withMessage('Content is required.'),
    body('date').optional().isISO8601().withMessage('Date must be ISO8601 format.')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { title, content, date } = req.body;
    const announcements = readAnnouncements();
    const newAnn = { id: Date.now(), title, content, date: date || new Date().toISOString() };
    announcements.unshift(newAnn);
    writeAnnouncements(announcements);
    res.status(201).json(newAnn);
  }
);

// Delete an announcement
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  let announcements = readAnnouncements();
  const initialLen = announcements.length;
  announcements = announcements.filter(a => a.id !== id);
  if (announcements.length === initialLen) {
    return res.status(404).json({ error: 'Announcement not found.' });
  }
  writeAnnouncements(announcements);
  res.json({ success: true });
});

module.exports = router;
