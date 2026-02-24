
// backend/readings-fetcher.js
// Fetches daily Catholic readings from Catholic Online and stores them in SQLite

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

const URL = 'https://www.catholic.org/bible/daily_reading/';

async function fetchAndStoreReadings() {
  try {
    console.log('[fetchAndStoreReadings] Starting fetch...');
    const res = await fetch(URL);
    console.log('[fetchAndStoreReadings] Fetch status:', res.status);
    if (!res.ok) throw new Error('Failed to fetch readings');
    const html = await res.text();
    console.log('[fetchAndStoreReadings] HTML length:', html.length);
    const $ = cheerio.load(html);

    // Extract date
    const dateHeading = $('h1, h2, h3').filter((i, el) => $(el).text().includes('Daily Reading for')).first().text();
    console.log('[fetchAndStoreReadings] dateHeading:', dateHeading);
    const dateMatch = dateHeading.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
    let dateISO = new Date().toISOString().split('T')[0];
    if (dateMatch) {
      dateISO = new Date(dateHeading.replace('Daily Reading for ', '')).toISOString().split('T')[0];
    }
    console.log('[fetchAndStoreReadings] dateISO:', dateISO);

    // Extract readings
    let readings = [];
    $('h3, h4').each((i, el) => {
      const title = $(el).text().trim();
      if (/Reading|Psalm|Gospel/i.test(title)) {
        let content = '';
        let next = $(el).next();
        while (next.length && !/h3|h4/i.test(next[0].name)) {
          content += next.text().trim() + '\n';
          next = next.next();
        }
        readings.push({ title, content: content.trim() });
      }
    });
    console.log('[fetchAndStoreReadings] readings found:', readings.length);
    readings.forEach(r => console.log('[fetchAndStoreReadings] Reading:', r.title));

    // Store readings in SQLite
    for (const reading of readings) {
      db.run(
        'INSERT INTO readings (date, title, content) VALUES (?, ?, ?)',
        [dateISO, reading.title, reading.content],
        err => {
          if (err) console.error('DB error:', err.message);
          else console.log('[fetchAndStoreReadings] Stored:', reading.title);
        }
      );
    }
    console.log('[fetchAndStoreReadings] Readings for', dateISO, 'stored.');
  } catch (err) {
    console.error('[fetchAndStoreReadings] Failed to fetch/store readings:', err);
  }
}

if (require.main === module) {
  fetchAndStoreReadings();
}

module.exports = fetchAndStoreReadings;
