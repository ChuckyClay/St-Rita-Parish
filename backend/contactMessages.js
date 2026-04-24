// backend/contactMessages.js

const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('./db');

const router = express.Router();


// ========================
// CREATE TABLE (safe init)
// ========================
db.run(`
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);


// ========================
// PUBLIC: Send message
// ========================
router.post(
  '/',
  [
    body('name').isString().trim().notEmpty(),
    body('phone').isString().trim().notEmpty(),
    body('message').isString().trim().notEmpty()
  ],
  (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, phone, message } = req.body;

    db.run(
      `INSERT INTO contact_messages (name, phone, message) VALUES (?, ?, ?)`,
      [name, phone, message],
      function (err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Message sent successfully'
        });
      }
    );
  }
);


// ========================
// ADMIN: Get all messages
// ========================
router.get('/', (req, res) => {
  db.all(
    `SELECT * FROM contact_messages ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      res.json(rows);
    }
  );
});


// ========================
// ADMIN: Delete message
// ========================
router.delete('/:id', (req, res) => {
  const id = req.params.id;

  db.run(
    `DELETE FROM contact_messages WHERE id = ?`,
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      res.json({
        success: true,
        message: 'Message deleted'
      });
    }
  );
});

module.exports = router;

// mark as red
router.put('/:id/read', (req, res) => {
  const id = req.params.id;

  db.run(
    `UPDATE contact_messages SET is_read = 1 WHERE id = ?`,
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      res.json({ success: true });
    }
  );
});