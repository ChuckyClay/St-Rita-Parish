
// backend/readings-fetcher.js
// Fetches daily Catholic readings from Catholic Online and stores them in SQLite


const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

const URL = 'https://www.catholic.org/bible/daily_reading/';

async function fetchAndStoreReadings() {
  try {
    const today = new Date().toISOString().split('T')[0];
    // Remove old readings for today
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM readings WHERE date = ?', [today], err => {
        if (err) reject(err);
        else resolve();
      });
    });
    const res = await fetch(URL);
    if (!res.ok) throw new Error('Failed to fetch readings');
    const html = await res.text();
    const $ = cheerio.load(html);
    // Extract date
    const dateHeading = $('h1, h2, h3').filter((i, el) => $(el).text().includes('Daily Reading for')).first().text();
    let dateISO = today;
    if (dateHeading) {
      const dateMatch = dateHeading.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
      if (dateMatch) {
        dateISO = new Date(dateHeading.replace('Daily Reading for ', '')).toISOString().split('T')[0];
      }
    }
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
    // Store readings in SQLite
    for (const reading of readings) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO readings (date, title, content) VALUES (?, ?, ?)',
          [dateISO, reading.title, reading.content],
          err => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
    return readings.length;
  } catch (err) {
    console.error('[fetchAndStoreReadings] Failed to fetch/store readings:', err);
    return 0;
  }
}

if (require.main === module) {
  fetchAndStoreReadings().then(count => {
    console.log('Fetched and stored', count, 'readings.');
  });
}

module.exports = fetchAndStoreReadings;
