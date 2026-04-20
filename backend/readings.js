const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('./db');
const router = express.Router();

function getKenyaDate() {
  const now = new Date();
  const kenya = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  return kenya.toISOString().split('T')[0];
}

function normalizeLang(lang) {
  const value = String(lang || 'en').trim().toLowerCase();
  return value === 'sw' ? 'sw' : 'en';
}

function sectionOrderSql() {
  return `
    CASE section_type
      WHEN 'FIRST' THEN 1
      WHEN 'PSALM' THEN 2
      WHEN 'SECOND' THEN 3
      WHEN 'ALLELUIA' THEN 4
      WHEN 'GOSPEL' THEN 5
      ELSE 99
    END
  `;
}

// GET /api/readings?lang=en|sw
// Returns today's readings for the chosen language, or latest available in that language.
router.get('/', (req, res) => {
  const today = getKenyaDate();
  const lang = normalizeLang(req.query.lang);

  db.all(
    `
    SELECT id, date, lang, section_type, title, content, source_name, source_url, fetched_at
    FROM readings
    WHERE date = ? AND lang = ?
    ORDER BY ${sectionOrderSql()}, id ASC
    `,
    [today, lang],
    (err, rows) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ error: 'Database error.' });
      }

      if (rows && rows.length > 0) {
        return res.json(rows);
      }

      db.all(
        `
        SELECT id, date, lang, section_type, title, content, source_name, source_url, fetched_at
        FROM readings
        WHERE lang = ?
          AND date = (
            SELECT MAX(date) FROM readings WHERE lang = ?
          )
        ORDER BY ${sectionOrderSql()}, id ASC
        `,
        [lang, lang],
        (fallbackErr, fallbackRows) => {
          if (fallbackErr) {
            console.error('Fallback DB error:', fallbackErr);
            return res.status(500).json({ error: 'Database error.' });
          }

          res.json(fallbackRows || []);
        }
      );
    }
  );
});

// POST /api/readings - manual insert
router.post(
  '/',
  [
    body('date').isISO8601().withMessage('Date must be ISO8601 format.'),
    body('title').isString().trim().notEmpty().withMessage('Title is required.'),
    body('content').isString().trim().notEmpty().withMessage('Content is required.'),
    body('lang').optional().isString().trim(),
    body('section_type').optional().isString().trim(),
    body('source_name').optional().isString().trim(),
    body('source_url').optional().isString().trim()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const date = req.body.date;
    const title = req.body.title;
    const content = req.body.content;
    const lang = normalizeLang(req.body.lang);
    const sectionType = String(req.body.section_type || 'OTHER').trim().toUpperCase();
    const sourceName = req.body.source_name || null;
    const sourceUrl = req.body.source_url || null;
    const fetchedAt = new Date().toISOString();

    db.run(
      `
      INSERT INTO readings
      (date, lang, section_type, title, content, source_name, source_url, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [date, lang, sectionType, title, content, sourceName, sourceUrl, fetchedAt],
      function (err) {
        if (err) {
          console.error('DB insert error:', err);
          return res.status(500).json({ error: 'Database error.' });
        }

        db.get(
          `
          SELECT id, date, lang, section_type, title, content, source_name, source_url, fetched_at
          FROM readings
          WHERE id = ?
          `,
          [this.lastID],
          (fetchErr, row) => {
            if (fetchErr) {
              console.error('DB fetch inserted row error:', fetchErr);
              return res.status(500).json({ error: 'Database error.' });
            }

            res.status(201).json(row);
          }
        );
      }
    );
  }
);

// DELETE /api/readings/:id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid reading id.' });
  }

  db.run('DELETE FROM readings WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('DB delete error:', err);
      return res.status(500).json({ error: 'Database error.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Reading not found.' });
    }

    res.json({ success: true });
  });
});

module.exports = router;