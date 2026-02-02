// backend/media.js
// Handles media uploads (image/video metadata)

const express = require('express');
const db = require('./db');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// All data is now stored in SQLite

// Get all media
router.get('/', (req, res) => {
  db.all('SELECT * FROM media ORDER BY date DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json(rows);
  });
});

// Add new media (image/video metadata)
router.post(
  '/',
  [
    body('type').isIn(['image', 'video']).withMessage('Type must be image or video.'),
    body('src').isString().trim().notEmpty().withMessage('Source is required.'),
    body('caption').isString().trim().notEmpty().withMessage('Caption is required.'),
    body('event').isString().trim().notEmpty().withMessage('Event is required.'),
    body('date').isISO8601().withMessage('Date must be ISO8601 format.')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { type, src, caption, event, date } = req.body;
    db.run(
      'INSERT INTO media (type, src, caption, event, date) VALUES (?, ?, ?, ?, ?)',
      [type, src, caption, event, date],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        db.get('SELECT * FROM media WHERE id = ?', [this.lastID], (err, row) => {
          if (err) return res.status(500).json({ error: 'Database error.' });
          res.status(201).json(row);
        });
      }
    );
  }
);

// Delete media by id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.run('DELETE FROM media WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Media not found.' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
