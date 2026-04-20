const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

const BASE_URL = 'https://mkatolikileo.com';
const LIST_URL = `${BASE_URL}/masomo-ya-misa/`;

function getKenyaNow() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })
  );
}

function getKenyaDate() {
  return getKenyaNow().toISOString().split('T')[0];
}

function clean(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\r/g, '')
    .trim();
}

function normalize(text) {
  return clean(text).toUpperCase();
}

function classify(title) {
  const t = normalize(title);

  if (t.includes('SOMO LA KWANZA')) return 'FIRST';
  if (t.includes('ZABURI') || t.includes('WIMBO')) return 'PSALM';
  if (t.includes('SOMO LA PILI')) return 'SECOND';
  if (t.includes('SHANGILIO') || t.includes('ALELUYA')) return 'ALLELUIA';
  if (t.includes('INJILI')) return 'GOSPEL';

  return 'OTHER';
}

function order(type) {
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
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  return res.text();
}

async function findTodayPost() {
  const today = getKenyaNow();
  const day = today.getDate();
  const year = today.getFullYear();

  const html = await fetchHtml(LIST_URL);
  const $ = cheerio.load(html);

  let url = null;

  $('a').each((_, el) => {
    const text = normalize($(el).text());
    const href = $(el).attr('href');

    if (!href) return;

    if (
      text.includes('MASOMO') &&
      text.includes(day.toString()) &&
      text.includes(year.toString())
    ) {
      url = href.startsWith('http') ? href : BASE_URL + href;
      return false;
    }
  });

  if (!url) {
    throw new Error('No Kiswahili post found for today');
  }

  console.log('[SW] Found:', url);
  return url;
}

function extract(html) {
  const $ = cheerio.load(html);

  const content = $('.entry-content, .post-content, article').first();

  if (!content.length) {
    console.log('[SW] content not found');
    return [];
  }

  const readings = [];
  let current = null;

  content.find('p').each((_, el) => {
    const text = clean($(el).text());
    if (!text) return;

    const type = classify(text);

    if (type !== 'OTHER') {
      if (current && current.content.length > 0) {
        readings.push({
          type: current.type,
          title: current.title,
          content: current.content.join('\n\n')
        });
      }

      current = {
        type,
        title: text,
        content: []
      };
      return;
    }

    if (!current) return;

    if (
      /NENO LA BWANA|TUMSHUKURU MUNGU|SIFA KWAKO/i.test(text.toUpperCase())
    ) {
      return;
    }

    current.content.push(text);
  });

  if (current && current.content.length > 0) {
    readings.push({
      type: current.type,
      title: current.title,
      content: current.content.join('\n\n')
    });
  }

  return readings
    .filter(r => r.content.trim().length > 0)
    .sort((a, b) => order(a.type) - order(b.type));
}

async function fetchAndStoreReadingsSw() {
  try {
    const date = getKenyaDate();

    const postUrl = await findTodayPost();
    const html = await fetchHtml(postUrl);

    const readings = extract(html);

    if (!readings.length) {
      console.log('[SW] No readings extracted');
      return 0;
    }

    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM readings WHERE date = ? AND lang = ?',
        [date, 'sw'],
        err => (err ? reject(err) : resolve())
      );
    });

    for (const r of readings) {
      await new Promise((resolve, reject) => {
        db.run(
          `
          INSERT INTO readings
          (date, lang, section_type, title, content, source_name, source_url, fetched_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            date,
            'sw',
            r.type,
            r.title,
            r.content,
            'Mkatoliki Leo',
            postUrl,
            new Date().toISOString()
          ],
          err => (err ? reject(err) : resolve())
        );
      });
    }

    console.log(`[SUCCESS] Stored ${readings.length} Kiswahili readings`);
    return readings.length;

  } catch (err) {
    console.error('[SW ERROR]', err.message);
    return 0;
  }
}

module.exports = fetchAndStoreReadingsSw;