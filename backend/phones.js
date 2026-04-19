const express = require('express');
const db = require('./db');
const { body, validationResult } = require('express-validator');
const router = express.Router();

function normalizeKenyanPhone(phone) {
  const cleaned = String(phone).replace(/\D/g, '');

  if (/^07\d{8}$/.test(cleaned)) {
    return '254' + cleaned.slice(1);
  }

  if (/^01\d{8}$/.test(cleaned)) {
    return '254' + cleaned.slice(1);
  }

  if (/^254[17]\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

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
  [
    body('phone')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Phone number is required.')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const normalizedPhone = normalizeKenyanPhone(req.body.phone);

    if (!normalizedPhone) {
      return res.status(400).json({
        error: 'Enter a valid Kenyan phone number.'
      });
    }

    db.run(
      'INSERT OR IGNORE INTO phones (phone) VALUES (?)',
      [normalizedPhone],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error.' });

        if (this.changes === 0) {
          return res.status(409).json({ error: 'Phone number already subscribed.' });
        }

        db.get(
          'SELECT * FROM phones WHERE id = ?',
          [this.lastID],
          (err, row) => {
            if (err) return res.status(500).json({ error: 'Database error.' });
            res.status(201).json(row);
          }
        );
      }
    );
  }
);

// Delete a phone number by id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid phone id.' });
  }

  db.run('DELETE FROM phones WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Phone number not found.' });
    }
    res.json({ success: true });
  });
});

module.exports = router;