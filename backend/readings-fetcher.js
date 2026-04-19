const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

const URL = 'https://www.catholic.org/bible/daily_reading/';

function getKenyaDate() {
  const now = new Date();
  const kenya = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  return kenya.toISOString().split('T')[0];
}

function cleanContent(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function classifyReadingTitle(title) {
  if (/First Reading/i.test(title)) return 'FIRST';
  if (/Second Reading/i.test(title)) return 'SECOND';
  if (/Responsorial Psalm|Psalm/i.test(title)) return 'PSALM';
  if (/Gospel/i.test(title)) return 'GOSPEL';
  if (/Reading/i.test(title)) return 'FIRST';
  return 'OTHER';
}

async function fetchAndStoreReadings() {
  try {
    const today = getKenyaDate();

    const res = await fetch(URL);
    if (!res.ok) throw new Error('Failed to fetch readings');

    const html = await res.text();
    const $ = cheerio.load(html);

    const dateHeading = $('h1, h2, h3')
      .filter((i, el) => $(el).text().includes('Daily Reading for'))
      .first()
      .text()
      .trim();

    let fetchedDate = today;

    if (dateHeading) {
      const parsed = new Date(dateHeading.replace('Daily Reading for ', '').trim());
      if (!isNaN(parsed)) {
        fetchedDate = parsed.toISOString().split('T')[0];
      }
    }

    if (fetchedDate !== today) {
      console.log(`[SKIP] Source still shows ${fetchedDate}; waiting for ${today}`);
      return 0;
    }

    let readings = [];

    $('h3, h4').each((i, el) => {
      const title = $(el).text().trim();

      if (/Reading|Psalm|Gospel/i.test(title)) {
        let content = '';
        let next = $(el).next();

        while (next.length && !/h3|h4/i.test(next[0].name)) {
          const piece = next.text().trim();
          if (piece) content += piece + '\n';
          next = next.next();
        }

        content = cleanContent(content);

        if (content) {
          readings.push({
            title,
            content,
            type: classifyReadingTitle(title)
          });
        }
      }
    });

    if (readings.length === 0) {
      console.log('[WARN] No readings extracted');
      return 0;
    }

    const order = {
      FIRST: 1,
      PSALM: 2,
      SECOND: 3,
      GOSPEL: 4,
      OTHER: 5
    };

    readings.sort((a, b) => order[a.type] - order[b.type]);

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM readings WHERE date = ?', [today], err => {
        if (err) reject(err);
        else resolve();
      });
    });

    for (const reading of readings) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO readings (date, title, content) VALUES (?, ?, ?)',
          [today, reading.title, reading.content],
          err => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log(`[SUCCESS] Stored ${readings.length} readings for ${today}`);
    return readings.length;
  } catch (err) {
    console.error('[ERROR] Failed to fetch/store readings:', err);
    return 0;
  }
}

if (require.main === module) {
  fetchAndStoreReadings().then(count => {
    console.log('Fetched and stored', count, 'readings.');
  });
}

module.exports = fetchAndStoreReadings;