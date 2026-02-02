const express = require('express');
const db = require('./db');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// All data is now stored in SQLite

// Get all announcements
router.get('/', (req, res) => {
  db.all('SELECT * FROM announcements ORDER BY date DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json(rows);
  });
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
    const annDate = date || new Date().toISOString();
    db.run(
      'INSERT INTO announcements (title, content, date) VALUES (?, ?, ?)',
      [title, content, annDate],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        db.get('SELECT * FROM announcements WHERE id = ?', [this.lastID], (err, row) => {
          if (err) return res.status(500).json({ error: 'Database error.' });
          res.status(201).json(row);
        });
      }
    );
  }
);

// Delete an announcement
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.run('DELETE FROM announcements WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }
    res.json({ success: true });
  });
});


// Edit an announcement
router.put('/:id', [
  body('title').isString().trim().notEmpty().withMessage('Title is required.'),
  body('content').isString().trim().notEmpty().withMessage('Content is required.'),
  body('date').optional().isISO8601().withMessage('Date must be ISO8601 format.')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const id = parseInt(req.params.id);
  const { title, content, date } = req.body;
  db.run(
    'UPDATE announcements SET title = ?, content = ?, date = ? WHERE id = ?',
    [title, content, date || new Date().toISOString(), id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error.' });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Announcement not found.' });
      }
      db.get('SELECT * FROM announcements WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json(row);
      });
    }
  );
});

module.exports = router;
