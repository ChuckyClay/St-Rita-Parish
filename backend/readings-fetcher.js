const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

const USCCB_DAILY_URL = 'https://bible.usccb.org/daily-bible-reading';
const USER_AGENT = 'Mozilla/5.0 (compatible; StRitaParishBot/1.0)';

function getKenyaNow() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })
  );
}

function getKenyaDate() {
  return getKenyaNow().toISOString().split('T')[0];
}

function buildUsccbSixDigitUrl(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `https://bible.usccb.org/bible/readings/${mm}${dd}${yy}.cfm`;
}

function cleanContent(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
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

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  return res.text();
}

function extractPageDate($) {
  const dt = $('.pager li.current time').attr('datetime');
  return dt ? dt.trim() : null;
}

function extractReadingsFromUsccbHtml(html) {
  const $ = cheerio.load(html);
  const pageDate = extractPageDate($);

  const readings = [];

  $('.b-verse').each((_, el) => {
    const title = cleanContent($(el).find('.content-header h3.name').first().text());
    const citation = cleanContent($(el).find('.content-header .address a').first().text());
    const rawContent = cleanContent($(el).find('.content-body p').first().text());

    const type = classifyReadingTitle(title);

    if (type === 'OTHER') return;
    if (!rawContent) return;

    readings.push({
      type,
      title: citation ? `${title} - ${citation}` : title,
      content: rawContent
    });
  });

  const filtered = readings
    .filter(r => r.content && r.content.trim().length > 0)
    .sort((a, b) => readingOrder(a.type) - readingOrder(b.type));

  return { pageDate, readings: filtered };
}

async function fetchAndStoreReadings() {
  try {
    const today = getKenyaDate();
    const kenyaNow = getKenyaNow();

    let html = await fetchHtml(USCCB_DAILY_URL);
    let { pageDate, readings } = extractReadingsFromUsccbHtml(html);

    if (pageDate !== today) {
      const exactUrl = buildUsccbSixDigitUrl(kenyaNow);
      console.log(`[INFO] Generic page date ${pageDate}; trying exact page ${exactUrl}`);

      try {
        html = await fetchHtml(exactUrl);
        const exactParsed = extractReadingsFromUsccbHtml(html);

        if (exactParsed.readings.length > 0) {
          pageDate = exactParsed.pageDate || today;
          readings = exactParsed.readings;
        }
      } catch (err) {
        console.warn(`[WARN] Exact dated page fetch failed: ${err.message}`);
      }
    }

    if (!Array.isArray(readings) || readings.length === 0) {
      console.log('[WARN] No USCCB readings extracted');
      return 0;
    }

    const storeDate = pageDate || today;
    const fetchedAt = new Date().toISOString();
    const lang = 'en';
    const sourceName = 'USCCB';
    const sourceUrl = USCCB_DAILY_URL;

    // Only replace English rows for that date
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM readings WHERE date = ? AND lang = ?',
        [storeDate, lang],
        err => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    for (const reading of readings) {
      await new Promise((resolve, reject) => {
        db.run(
          `
          INSERT INTO readings
          (date, lang, section_type, title, content, source_name, source_url, fetched_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            storeDate,
            lang,
            reading.type,
            reading.title,
            reading.content,
            sourceName,
            sourceUrl,
            fetchedAt
          ],
          err => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log(`[SUCCESS] Stored ${readings.length} English readings for ${storeDate}`);
    return readings.length;
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