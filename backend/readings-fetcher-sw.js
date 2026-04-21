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
  const month = monthNameSw(today);
  const weekday = weekdayNameSw(today);

  const html = await fetchHtml(LIST_URL);
  const $ = cheerio.load(html);

  let found = null;

  // The listing page uses links whose visible text can be empty.
  // So inspect each masomo card/container and read its nearby heading/date text.
  $('a[href*="/masomo-ya-misa/"]').each((_, el) => {
    const href = $(el).attr('href');
    const block = $(el).closest('div, article, li');
    const nearbyText = normalize(block.text());

    if (
      nearbyText.includes(month) &&
      nearbyText.includes(day) &&
      nearbyText.includes(year) &&
      (nearbyText.includes(weekday) || nearbyText.includes('MASOMO'))
    ) {
      found = absoluteUrl(href);
      return false;
    }
  });

  if (!found) {
    // Fallback: inspect all headings and find the linked one nearest today's date
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const headingText = normalize($(el).text());
      const parentText = normalize($(el).parent().text());
      const link = $(el).closest('a[href*="/masomo-ya-misa/"]');

      if (
        (headingText.includes(month) || parentText.includes(month)) &&
        (headingText.includes(day) || parentText.includes(day)) &&
        (headingText.includes(year) || parentText.includes(year)) &&
        link.length
      ) {
        found = absoluteUrl(link.attr('href'));
        return false;
      }
    });
  }

  if (!found) {
    throw new Error('No Kiswahili post found for today');
  }

  console.log('[SW] Found:', found);
  return found;
}

function extract(html) {
  const $ = cheerio.load(html);

  // Use the full text of the article page and parse by lines.
  const articleText = clean($('body').text());
  if (!articleText) {
    console.log('[SW] article text not found');
    return [];
  }

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

    // Start section
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

    // Stop when comments/footer area starts
    if (
      upper.includes('MAONI') ||
      upper.includes('INGIA UTOE MAONI') ||
      upper.includes('COPYRIGHT') ||
      upper.includes('MAISHA YA KIKATOLIKI')
    ) {
      break;
    }

    // First short scripture-looking line after section header becomes title citation
    if (
      expectingCitation &&
      line.length < 120 &&
      /^(MDO|ZAB|YN|LK|MT|MK|RUM|1KOR|2KOR|EF|FLP|KOL|1THE|2THE|1TIM|2TIM|TIT|FLM|EBR|YAK|1PET|2PET|1YN|2YN|3YN|YUD|UFU)\.?/i.test(line)
    ) {
      current.title = `${current.title} - ${line}`;
      expectingCitation = false;
      continue;
    }

    expectingCitation = false;

    // Skip liturgical responses/closings
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