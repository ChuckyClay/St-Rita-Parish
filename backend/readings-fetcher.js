const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

const USCCB_DAILY_URL = 'https://bible.usccb.org/daily-bible-reading';

function getKenyaNow() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })
  );
}

function getKenyaDate() {
  return getKenyaNow().toISOString().split('T')[0];
}

function cleanContent(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function classifyReadingTitle(title) {
  const t = String(title || '').trim();

  if (/^Reading 1$|^Reading I$|^First Reading$/i.test(t)) return 'FIRST';
  if (/^Responsorial Psalm$|^Psalm$/i.test(t)) return 'PSALM';
  if (/^Reading 2$|^Reading II$|^Second Reading$/i.test(t)) return 'SECOND';
  if (/^Alleluia$/i.test(t)) return 'ALLELUIA';
  if (/^Gospel$/i.test(t)) return 'GOSPEL';

  return 'OTHER';
}

function readingOrder(type) {
  return {
    FIRST: 1,
    PSALM: 2,
    SECOND: 3,
    ALLELUIA: 4,
    GOSPEL: 5,
    OTHER: 99
  }[type] || 99;
}

function isNoise(text) {
  return /LISTEN PODCAST|VIEW REFLECTION VIDEO|En Español|View Calendar|Get Daily Readings E-mails|Lectionary:|SUBSCRIBE|Terms & Privacy|Dive into God's Word|About USCCB/i.test(text);
}

function looksLikeCitation(text) {
  return (
    /^[1-3]?\s?[A-Z][A-Za-z\s.'-]+\s\d+:\d+/.test(text) ||
    /^[A-Z][A-Za-z\s.'-]+\s\d+:\d+/.test(text) ||
    /^Cf\.\s/i.test(text)
  );
}

function getNodeText($, node) {
  if (!node) return '';
  if (node.type === 'text') return cleanContent(node.data || '');
  return cleanContent($(node).text());
}

async function fetchAndStoreReadings() {
  try {
    const today = getKenyaDate();

    const res = await fetch(USCCB_DAILY_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StRitaParishBot/1.0)'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch USCCB page: ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const readings = [];

    $('h3').each((_, el) => {
      const heading = cleanContent($(el).text());
      const type = classifyReadingTitle(heading);

      if (type === 'OTHER') return;

      let title = heading;
      const contentParts = [];
      let citationCaptured = false;

      let node = el.nextSibling;

      while (node) {
        if (node.type === 'tag' && node.tagName && node.tagName.toLowerCase() === 'h3') {
          break;
        }

        const text = getNodeText($, node);

        if (text && !isNoise(text)) {
          if (!citationCaptured && looksLikeCitation(text) && text.length < 140) {
            title += ` - ${text}`;
            citationCaptured = true;
          } else {
            contentParts.push(text);
          }
        }

        node = node.nextSibling;
      }

      const content = cleanContent(
        contentParts
          .join('\n\n')
          .replace(/\nR\.\s/g, '\nR. ')
      );

      if (content) {
        readings.push({ type, title, content });
      }
    });

    const filtered = readings
      .filter(r => r.content && r.content.trim().length > 0)
      .sort((a, b) => readingOrder(a.type) - readingOrder(b.type));

    if (filtered.length === 0) {
      console.log('[WARN] No USCCB readings extracted');
      return 0;
    }

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM readings WHERE date = ?', [today], err => {
        if (err) reject(err);
        else resolve();
      });
    });

    for (const reading of filtered) {
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

    console.log(`[SUCCESS] Stored ${filtered.length} readings for ${today}`);
    return filtered.length;
  } catch (err) {
    console.error('[ERROR] Failed to fetch/store USCCB readings:', err);
    return 0;
  }
}

if (require.main === module) {
  fetchAndStoreReadings().then(count => {
    console.log('Fetched and stored', count, 'readings.');
  });
}

module.exports = fetchAndStoreReadings;