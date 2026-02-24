const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('./db');
const router = express.Router();

// GET /api/readings - Get today's readings

router.get('/', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  db.all('SELECT * FROM readings WHERE date = ? ORDER BY id ASC', [today], (err, rows) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'Database error.' });
    }
    res.json(rows);
  });
});

// POST /api/readings - Add a new reading
router.post(
  '/',
  [
    body('date').isISO8601().withMessage('Date must be ISO8601 format.'),
    body('title').isString().trim().notEmpty().withMessage('Title is required.'),
    body('content').isString().trim().notEmpty().withMessage('Content is required.')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { date, title, content } = req.body;
    db.run(
      'INSERT INTO readings (date, title, content) VALUES (?, ?, ?)',
      [date, title, content],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        db.get('SELECT * FROM readings WHERE id = ?', [this.lastID], (err, row) => {
          if (err) return res.status(500).json({ error: 'Database error.' });
          res.status(201).json(row);
        });
      }
    );
  }
);

// DELETE /api/readings/:id - Delete a reading by id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.run('DELETE FROM readings WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Reading not found.' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
