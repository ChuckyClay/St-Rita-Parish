
// backend/phones.js
// Handles phone number subscriptions using SQLite

const express = require('express');
const db = require('./db');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Get all subscribed phone numbers
router.get('/', (req, res) => {
  db.all('SELECT * FROM phones ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json(rows);
  });
});

// Add a new phone number
router.post(
  '/',
  [body('phone').isString().trim().notEmpty().withMessage('Phone number is required.')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { phone } = req.body;
    db.run(
      'INSERT OR IGNORE INTO phones (phone) VALUES (?)',
      [phone],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        db.get('SELECT * FROM phones WHERE id = ?', [this.lastID], (err, row) => {
          if (err) return res.status(500).json({ error: 'Database error.' });
          res.status(201).json(row);
        });
      }
    );
  }
);

// Delete a phone number by id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.run('DELETE FROM phones WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Phone number not found.' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
