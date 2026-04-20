const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

const USER_AGENT = 'Mozilla/5.0 (compatible; StRitaParishBot/1.0)';
const SOURCE_NAME = 'Mkatoliki Kiganjani';

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
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function classifySwSection(title) {
  const t = String(title || '').trim().toUpperCase();

  if (t === 'SOMO 1') return 'FIRST';
  if (t === 'WIMBO WA KATIKATI') return 'PSALM';
  if (t === 'SOMO 2') return 'SECOND';
  if (t === 'SHANGILIO' || t === 'ALELUYA') return 'ALLELUIA';
  if (t === 'INJILI') return 'GOSPEL';

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

function monthNameSw(date) {
  const names = [
    'JANUARI', 'FEBRUARI', 'MACHI', 'APRILI', 'MEI', 'JUNI',
    'JULAI', 'AGOSTI', 'SEPTEMBA', 'OKTOBA', 'NOVEMBA', 'DESEMBA'
  ];
  return names[date.getMonth()];
}

function buildSearchPattern(date) {
  const d = date.getDate();
  const month = monthNameSw(date);
  const yyyy = date.getFullYear();
  return `MASOMO YA MISA, ${month} ${d}, ${yyyy}`;
}

async function searchTodayPostUrl() {
  const today = getKenyaNow();
  const pattern = buildSearchPattern(today);

  const searchUrl = `https://www.mkatolikikiganjani.com/search.php?q=${encodeURIComponent(pattern)}`;

  const res = await fetch(searchUrl, {
    headers: { 'User-Agent': USER_AGENT }
  });

  if (!res.ok) {
    throw new Error(`Failed to search Kiswahili source: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  let postUrl = null;

  $('a[href*="post.php?id="]').each((_, el) => {
    const href = $(el).attr('href');
    const text = cleanContent($(el).text());

    if (!href) return;

    if (text.toUpperCase().includes('MASOMO YA MISA')) {
      postUrl = href.startsWith('http')
        ? href
        : `https://www.mkatolikikiganjani.com/${href.replace(/^\//, '')}`;
      return false;
    }
  });

  if (!postUrl) {
    throw new Error('No Kiswahili readings post found for today.');
  }

  return postUrl;
}

function extractReadingsFromSwHtml(html) {
  const $ = cheerio.load(html);

  // Try to work inside the main article
  const root = $('body');

  const rawText = cleanContent(root.text());
  if (!rawText) return [];

  const lines = rawText
    .split('\n')
    .map(line => cleanContent(line))
    .filter(Boolean);

  const readings = [];
  let current = null;

  for (const line of lines) {
    const type = classifySwSection(line);

    if (type !== 'OTHER') {
      if (current && current.content.length > 0) {
        readings.push({
          type: current.type,
          title: current.title,
          content: cleanContent(current.content.join('\n\n'))
        });
      }

      current = {
        type,
        title: line,
        content: []
      };
      continue;
    }

    if (!current) continue;

    // stop when footer/news/contact noise begins
    if (
      /HABARI ZA HIVI KARIBUNI|WASILIANA NASI|TUFUATILIE|HABARI MAARUFU|VIPENGELE|HAKI ZOTE ZIMEHIFADHIWA/i.test(line)
    ) {
      break;
    }

    // first meaningful line after heading becomes title/citation
    if (
      current.title === 'SOMO 1' ||
      current.title === 'WIMBO WA KATIKATI' ||
      current.title === 'SOMO 2' ||
      current.title === 'SHANGILIO' ||
      current.title === 'INJILI'
    ) {
      current.title = `${current.title} - ${line}`;
      continue;
    }

    // skip boilerplate labels
    if (/NENO LA BWANA|TUMSHUKURU MUNGU|SIFA KWAKO EE KRISTO/i.test(line)) {
      continue;
    }

    current.content.push(line);
  }

  if (current && current.content.length > 0) {
    readings.push({
      type: current.type,
      title: current.title,
      content: cleanContent(current.content.join('\n\n'))
    });
  }

  return readings.sort((a, b) => readingOrder(a.type) - readingOrder(b.type));
}

async function fetchAndStoreReadingsSw() {
  try {
    const storeDate = getKenyaDate();
    const sourceUrl = await searchTodayPostUrl();

    const res = await fetch(sourceUrl, {
      headers: { 'User-Agent': USER_AGENT }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Kiswahili post: ${res.status}`);
    }

    const html = await res.text();
    const readings = extractReadingsFromSwHtml(html);

    if (!Array.isArray(readings) || readings.length === 0) {
      console.log('[WARN] No Kiswahili readings extracted');
      return 0;
    }

    const fetchedAt = new Date().toISOString();
    const lang = 'sw';

    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM readings WHERE date = ? AND lang = ?',
        [storeDate, lang],
        err => (err ? reject(err) : resolve())
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
            SOURCE_NAME,
            sourceUrl,
            fetchedAt
          ],
          err => (err ? reject(err) : resolve())
        );
      });
    }

    console.log(`[SUCCESS] Stored ${readings.length} Kiswahili readings for ${storeDate}`);
    return readings.length;
  } catch (err) {
    console.error('[ERROR] Failed to fetch/store Kiswahili readings:', err);
    return 0;
  }
}

if (require.main === module) {
  fetchAndStoreReadingsSw().then(count => {
    console.log('Fetched and stored', count, 'Kiswahili readings.');
  });
}

module.exports = fetchAndStoreReadingsSw;