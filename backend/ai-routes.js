const express = require('express');
const db = require('./db');
const { isCatholicOrParishQuestion } = require('./ai-scope');
const { buildParishContext, getCatholicChatResponse } = require('./ai-service');

const router = express.Router();

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getKenyaDate() {
  const now = new Date();
  const kenya = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  return kenya.toISOString().split('T')[0];
}

router.post('/chat', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (!isCatholicOrParishQuestion(message)) {
      return res.json({
        reply: 'I can help with Catholic faith, St. Rita Parish information, Mass, sacraments, saints, prayers, daily readings, announcements, and related questions.'
      });
    }

    const today = getKenyaDate();

    const [announcements, events, readings] = await Promise.all([
      dbAll(`SELECT title, content, date FROM announcements ORDER BY date DESC LIMIT 5`),
      dbAll(`SELECT title, description, date, time FROM events ORDER BY date ASC LIMIT 5`),
      dbAll(
        `SELECT title, content FROM readings WHERE date = ? AND lang = 'en' ORDER BY id ASC LIMIT 5`,
        [today]
      )
    ]);

    const parishContext = buildParishContext({ announcements, events, readings });
    const reply = await getCatholicChatResponse({
      userMessage: message,
      parishContext
    });

    return res.json({ reply });
  } catch (err) {
        console.error('AI chat error:', err);

        if (err.message === 'NO_API_KEY') {
            return res.json({
            reply: 'Rita is not configured yet. Please contact the administrator.'
            });
        }

        return res.json({
            reply: 'Sorry, I could not respond right now.'
        });
    }
});

module.exports = router;