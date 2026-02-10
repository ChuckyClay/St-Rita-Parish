
// backend/messages.js
// Handles sending messages to subscribers (metadata only, now using SQLite)

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('./db');
const router = express.Router();

// Get all messages
router.get('/', (req, res) => {
  db.all('SELECT * FROM messages ORDER BY date DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    res.json(rows);
  });
});

// Send a message (store metadata)
router.post(
  '/',
  [body('message').isString().trim().notEmpty().withMessage('Message is required.')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { message } = req.body;
    const msgDate = new Date().toISOString();
    db.run(
      'INSERT INTO messages (message, date) VALUES (?, ?)',
      [message, msgDate],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        db.get('SELECT * FROM messages WHERE id = ?', [this.lastID], (err, row) => {
          if (err) return res.status(500).json({ error: 'Database error.' });
          res.status(201).json(row);
        });
      }
    );
  }
);

// Delete a message by id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.run('DELETE FROM messages WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
