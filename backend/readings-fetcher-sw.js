const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

const BASE_URL = 'https://mkatolikileo.com';
const LIST_URL = `${BASE_URL}/masomo-ya-misa`;

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
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(text) {
  return clean(text).toUpperCase();
}

function monthNameSw(date) {
  const names = [
    'JANUARI', 'FEBRUARI', 'MACHI', 'APRILI', 'MEI', 'JUNI',
    'JULAI', 'AGOSTI', 'SEPTEMBA', 'OKTOBA', 'NOVEMBA', 'DESEMBA'
  ];
  return names[date.getMonth()];
}

function weekdayNameSw(date) {
  const names = [
    'JUMAPILI', 'JUMATATU', 'JUMANNE', 'JUMATANO',
    'ALHAMISI', 'IJUMAA', 'JUMAMOSI'
  ];
  return names[date.getDay()];
}

function classify(title) {
  const t = normalize(title);

  if (t === 'SOMO LA 1' || t === 'SOMO LA KWANZA' || t === 'SOMO 1') return 'FIRST';
  if (t.includes('WIMBO WA KATIKATI') || t.includes('ZABURI')) return 'PSALM';
  if (t === 'SOMO LA 2' || t === 'SOMO LA PILI' || t === 'SOMO 2') return 'SECOND';
  if (t.includes('SHANGILIO') || t.includes('ALELUYA')) return 'ALLELUIA';
  if (t === 'INJILI') return 'GOSPEL';

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
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; StRitaParishBot/1.0)'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  return res.text();
}

function absoluteUrl(href) {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  return `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
}

async function findTodayPost() {
  const today = getKenyaNow();
  const day = String(today.getDate());
  const year = String(today.getFullYear());
  const month = monthNameSw(today); // e.g. APRILI

  const html = await fetchHtml(LIST_URL);
  const $ = cheerio.load(html);

  let found = null;

  // On this site, the real title link is in the heading inside the listing card
  $('h2 a, h3 a, h4 a, a[href*="/masomo-ya-misa/"]').each((_, el) => {
    const text = normalize($(el).text());
    const href = $(el).attr('href');

    if (!href) return;

    if (
      text.includes(month) &&
      text.includes(day) &&
      text.includes(year)
    ) {
      found = href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
      return false;
    }
  });

  if (!found) {
    throw new Error('No Kiswahili post found for today');
  }

  console.log('[SW] Found:', found);
  return found;
}

function extract(html) {
  const $ = cheerio.load(html);

  const lines = $('body')
    .text()
    .split('\n')
    .map(line => clean(line))
    .filter(Boolean);

  const readings = [];
  let current = null;
  let expectingCitation = false;

  for (const line of lines) {
    const upper = normalize(line);
    const type = classify(line);

    // start new section
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
        title: line,
        content: []
      };
      expectingCitation = true;
      continue;
    }

    if (!current) continue;

    // stop after main content
    if (
      upper.includes('IMEPENDWA') ||
      upper.includes('MAONI') ||
      upper.includes('INGIA UTOE MAONI') ||
      upper.includes('COPYRIGHT') ||
      upper.includes('MAISHA YA KIKATOLIKI')
    ) {
      break;
    }

    // first scripture ref after section header becomes title suffix
    if (
      expectingCitation &&
      line.length < 120 &&
      /^(MDO|ZAB|YN|LK|MT|MK|RUM|1PET|2PET|1KOR|2KOR|EF|FLP|KOL)\b\.?/i.test(line)
    ) {
      current.title = `${current.title} - ${line}`;
      expectingCitation = false;
      continue;
    }

    expectingCitation = false;

    if (
      upper.includes('NENO LA BWANA') ||
      upper.includes('TUMSHUKURU MUNGU') ||
      upper.includes('SIFA KWAKO EE KRISTO')
    ) {
      continue;
    }

    current.content.push(line);
  }

  if (current && current.content.length > 0) {
    readings.push({
      type: current.type,
      title: current.title,
      content: current.content.join('\n\n')
    });
  }

  return readings
    .filter(r => clean(r.content).length > 0)
    .map(r => ({
      ...r,
      content: clean(r.content)
    }))
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