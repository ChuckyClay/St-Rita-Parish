const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

const USER_AGENT = 'Mozilla/5.0 (compatible; StRitaParishBot/1.0)';
const SOURCE_NAME = 'Mkatoliki Kiganjani';
const BASE_URL = 'https://www.mkatolikikiganjani.com/';

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

function normalizeText(text) {
  return cleanContent(text)
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim()
    .toUpperCase();
}

function monthNameSw(date) {
  const names = [
    'JANUARI', 'FEBRUARI', 'MACHI', 'APRILI', 'MEI', 'JUNI',
    'JULAI', 'AGOSTI', 'SEPTEMBA', 'OKTOBA', 'NOVEMBA', 'DESEMBA'
  ];
  return names[date.getMonth()];
}

function classifySwSection(title) {
  const t = normalizeText(title);

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

function normalizeUrl(href) {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  return BASE_URL + href.replace(/^\//, '');
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

function titleMatchesToday(title, date) {
  const t = normalizeText(title);
  const month = monthNameSw(date);
  const day = String(date.getDate());
  const year = String(date.getFullYear());

  return (
    t.includes('MASOMO YA MISA') &&
    t.includes(month) &&
    t.includes(day) &&
    t.includes(year)
  );
}

async function findTodayPostUrl() {
  const today = getKenyaNow();
  const html = await fetchHtml(BASE_URL);
  const $ = cheerio.load(html);

  let postUrl = null;

  $('.latest-news-item').each((_, el) => {
    const title = $(el).find('h6').first().text();
    const href = $(el).attr('href');

    if (titleMatchesToday(title, today)) {
      postUrl = normalizeUrl(href);
      return false;
    }
  });

  if (!postUrl) {
    $('a[href*="post.php?id="]').each((_, el) => {
      const text = $(el).text();
      const href = $(el).attr('href');

      if (titleMatchesToday(text, today)) {
        postUrl = normalizeUrl(href);
        return false;
      }
    });
  }

  if (!postUrl) {
    throw new Error('No Kiswahili readings post found for today.');
  }

  console.log('[SW] Found post URL:', postUrl);
  return postUrl;
}

function extractReadingsFromSwHtml(html) {
  const $ = cheerio.load(html);

  const article = $('.news-content').first();
  if (!article.length) {
    console.log('[SW] .news-content not found');
    return [];
  }

  const readings = [];
  let current = null;

  article.find('p').each((_, el) => {
    const paragraphText = cleanContent($(el).text());
    if (!paragraphText) return;

    const upper = normalizeText(paragraphText);

    // Skip heading/date/liturgical-week intro
    if (
      upper.startsWith('JUMA LA') ||
      upper.startsWith('MASOMO YA MISA') ||
      /^APR \d{1,2}, \d{4}$/i.test(paragraphText)
    ) {
      return;
    }

    const sectionType = classifySwSection(paragraphText);

    if (sectionType !== 'OTHER') {
      if (current && current.content.length > 0) {
        readings.push({
          type: current.type,
          title: current.title,
          content: cleanContent(current.content.join('\n\n'))
        });
      }

      current = {
        type: sectionType,
        title: normalizeText(paragraphText)
          .replace('WIMBO WA KATIKATI', 'WIMBO WA KATIKATI')
          .replace('SHANGILIO', 'SHANGILIO')
          .replace('INJILI', 'INJILI')
          .replace('SOMO 1', 'SOMO 1')
          .replace('SOMO 2', 'SOMO 2'),
        content: []
      };
      return;
    }

    if (!current) return;

    if (
      /HABARI ZA HIVI KARIBUNI|WASILIANA NASI|TUFUATILIE|HABARI MAARUFU|VIPENGELE|HAKI ZOTE ZIMEHIFADHIWA/i.test(upper)
    ) {
      return false;
    }

    const isCitation =
      paragraphText.length < 140 &&
      /^(MDO\.|ZAB\.|YN\.|LK\.|MT\.|MK\.|YOH\.|MDO|ZAB|YN|LK|MT|MK)/i.test(paragraphText);

    if (
      ['SOMO 1', 'WIMBO WA KATIKATI', 'SOMO 2', 'SHANGILIO', 'INJILI', 'ALELUYA'].includes(current.title)
    ) {
      if (isCitation) {
        current.title = `${current.title} - ${cleanContent(paragraphText)}`;
        return;
      }
    }

    if (/NENO LA BWANA|TUMSHUKURU MUNGU|SIFA KWAKO EE KRISTO/i.test(upper)) {
      return;
    }

    current.content.push(paragraphText);
  });

  if (current && current.content.length > 0) {
    readings.push({
      type: current.type,
      title: current.title,
      content: cleanContent(current.content.join('\n\n'))
    });
  }

  console.log('[SW] Extracted sections:', readings.map(r => r.title));

  return readings
    .filter(r => r.content && r.content.trim().length > 0)
    .sort((a, b) => readingOrder(a.type) - readingOrder(b.type));
}

async function fetchAndStoreReadingsSw() {
  try {
    const storeDate = getKenyaDate();
    const sourceUrl = await findTodayPostUrl();
    const html = await fetchHtml(sourceUrl);
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