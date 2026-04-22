const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('./db');
const { translateReadingBlock } = require('./translate');

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

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// GET /api/readings?lang=en|sw
router.get('/', async (req, res) => {
  try {
    const today = getKenyaDate();
    const lang = normalizeLang(req.query.lang);

    const todayRows = await dbAll(
      `
      SELECT id, date, lang, section_type, title, content, day_title, lectionary, source_name, source_url, fetched_at
      FROM readings
      WHERE date = ? AND lang = ?
      ORDER BY ${sectionOrderSql()}, id ASC
      `,
      [today, lang]
    );

    if (todayRows.length > 0) {
      return res.json(todayRows);
    }

    if (lang === 'sw') {
      const englishRows = await dbAll(
        `
        SELECT id, date, lang, section_type, title, content, day_title, lectionary, source_name, source_url, fetched_at
        FROM readings
        WHERE date = ? AND lang = 'en'
        ORDER BY ${sectionOrderSql()}, id ASC
        `,
        [today]
      );

      if (englishRows.length > 0) {
        const translatedRows = [];
        let translationWorked = true;

        for (const row of englishRows) {
          try {
            const translated = await translateReadingBlock({
              title: row.title,
              content: row.content,
              day_title: row.day_title
            });

            translatedRows.push({
              ...row,
              date: today,
              lang: 'sw',
              title: translated.title,
              content: translated.content,
              day_title: translated.day_title,
              lectionary: row.lectionary || null,
              source_name: 'AUTO_TRANSLATED'
            });

            // small delay to reduce free-tier throttling
            await new Promise(resolve => setTimeout(resolve, 1500));
          } catch (err) {
            translationWorked = false;
            console.error('[AUTO] Kiswahili translation failed, not caching sw rows:', err.message);
            translatedRows.length = 0; // clear any partial translations
            break;
          }
        }

        if (translationWorked && translatedRows.length === englishRows.length) {
          for (const row of translatedRows) {
            await dbRun(
              `
              INSERT INTO readings
              (date, lang, section_type, title, content, day_title, lectionary, source_name, source_url, fetched_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
              [
                today,
                'sw',
                row.section_type,
                row.title,
                row.content,
                row.day_title,
                row.lectionary,
                'AUTO_TRANSLATED',
                row.source_url,
                new Date().toISOString()
              ]
            );
          }

          console.log('[AUTO] Generated and cached Kiswahili readings from English');
          return res.json({
            lang: 'sw',
            fallback: false,
            readings: translatedRows
          });
        }

        // translation failed: do NOT cache fake sw rows
        return res.json({
          lang: 'en',
          fallback: true,
          retry: true,
          message: 'Kiswahili translation is temporarily unavailable. Showing English readings instead.',
          readings: englishRows
        });
      }
    }

    const fallbackRows = await dbAll(
      `
      SELECT id, date, lang, section_type, title, content, day_title, lectionary, source_name, source_url, fetched_at
      FROM readings
      WHERE lang = ?
        AND date = (
          SELECT MAX(date) FROM readings WHERE lang = ?
        )
      ORDER BY ${sectionOrderSql()}, id ASC
      `,
      [lang, lang]
    );

    return res.json(fallbackRows || []);
  } catch (err) {
    console.error('Readings route error:', err);
    return res.status(500).json({ error: 'Database error.' });
  }
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
    body('day_title').optional().isString().trim(),
    body('lectionary').optional().isString().trim(),
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
    const dayTitle = req.body.day_title || null;
    const lectionary = req.body.lectionary || null;
    const sourceName = req.body.source_name || null;
    const sourceUrl = req.body.source_url || null;
    const fetchedAt = new Date().toISOString();

    db.run(
      `
      INSERT INTO readings
      (date, lang, section_type, title, content, day_title, lectionary, source_name, source_url, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [date, lang, sectionType, title, content, dayTitle, lectionary, sourceName, sourceUrl, fetchedAt],
      function (err) {
        if (err) {
          console.error('DB insert error:', err);
          return res.status(500).json({ error: 'Database error.' });
        }

        db.get(
          `
          SELECT id, date, lang, section_type, title, content, day_title, lectionary, source_name, source_url, fetched_at
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