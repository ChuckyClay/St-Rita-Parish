const express = require('express');
const db = require('./db');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// All data is now stored in SQLite

// Get all events
router.get('/', (req, res) => {
  db.all('SELECT * FROM events ORDER BY date DESC, time DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json(rows);
  });
});

// Add a new event with validation
router.post(
  '/',
  [
    body('title').isString().trim().notEmpty().withMessage('Title is required.'),
    body('description').isString().trim().notEmpty().withMessage('Description is required.'),
    body('date').isISO8601().withMessage('Date must be ISO8601 format.'),
    body('time').isString().trim().notEmpty().withMessage('Time is required.')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { title, description, date, time } = req.body;
    db.run(
      'INSERT INTO events (title, description, date, time) VALUES (?, ?, ?, ?)',
      [title, description, date, time],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        db.get('SELECT * FROM events WHERE id = ?', [this.lastID], (err, row) => {
          if (err) return res.status(500).json({ error: 'Database error.' });
          res.status(201).json(row);
        });
      }
    );
  }
);

// Delete an event
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.run('DELETE FROM events WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    res.json({ success: true });
  });
});


// Edit an event
router.put('/:id', [
  body('title').isString().trim().notEmpty().withMessage('Title is required.'),
  body('description').isString().trim().notEmpty().withMessage('Description is required.'),
  body('date').isISO8601().withMessage('Date must be ISO8601 format.'),
  body('time').isString().trim().notEmpty().withMessage('Time is required.')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const id = parseInt(req.params.id);
  const { title, description, date, time } = req.body;
  db.run(
    'UPDATE events SET title = ?, description = ?, date = ?, time = ? WHERE id = ?',
    [title, description, date, time, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error.' });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Event not found.' });
      }
      db.get('SELECT * FROM events WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json(row);
      });
    }
  );
});

module.exports = router;
