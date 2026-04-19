const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

const RSS_URL = 'https://www.usccb.org/bible/readings/rss/index.cfm';

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
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function classifyUSCCBSection(title) {
  const t = String(title || '').trim();

  if (/^Reading I$/i.test(t) || /^First Reading$/i.test(t) || /^Reading 1$/i.test(t)) {
    return 'FIRST';
  }
  if (/^Responsorial Psalm$/i.test(t) || /^Psalm$/i.test(t)) {
    return 'PSALM';
  }
  if (/^Reading II$/i.test(t) || /^Second Reading$/i.test(t) || /^Reading 2$/i.test(t)) {
    return 'SECOND';
  }
  if (/^Gospel$/i.test(t)) {
    return 'GOSPEL';
  }
  return 'OTHER';
}

function readingOrder(type) {
  return {
    FIRST: 1,
    PSALM: 2,
    SECOND: 3,
    GOSPEL: 4,
    OTHER: 5
  }[type] || 99;
}

function getUsccbDatePath() {
  const now = new Date();
  const kenya = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  const yyyy = kenya.getFullYear();
  const mm = String(kenya.getMonth() + 1).padStart(2, '0');
  const dd = String(kenya.getDate()).padStart(2, '0');
  return `/bible/readings/${mm}${dd}${yyyy}.cfm`;
}

async function fetchRssLinkForToday() {
  const res = await fetch(RSS_URL);
  if (!res.ok) throw new Error('Failed to fetch USCCB RSS feed');

  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });

  const expectedPath = getUsccbDatePath();
  let chosenLink = null;

  $('item').each((_, item) => {
    const link = $(item).find('link').first().text().trim();
    if (link && link.includes(expectedPath)) {
      chosenLink = link;
      return false;
    }
  });

  return chosenLink;
}

async function fetchDailyPageLinkFallback() {
  const todayPath = getUsccbDatePath();
  return `https://bible.usccb.org${todayPath}`;
}

async function parseUsccbDailyPage(pageUrl) {
  const res = await fetch(pageUrl);
  if (!res.ok) throw new Error('Failed to fetch USCCB daily reading page');

  const html = await res.text();
  const $ = cheerio.load(html);

  const readings = [];

  // USCCB pages expose headings like Reading I, Responsorial Psalm, Reading II, Gospel.
  $('h3').each((_, el) => {
    const sectionTitle = $(el).text().trim();
    const type = classifyUSCCBSection(sectionTitle);

    if (type === 'OTHER') return;

    let combinedTitle = sectionTitle;
    let content = '';
    let next = $(el).next();

    while (next.length && next[0].tagName !== 'h3') {
      const tag = next[0].tagName;
      const text = next.text().trim();

      if (!text) {
        next = next.next();
        continue;
      }

      // Capture scripture citation if present
      if ((tag === 'h4' || tag === 'h5') && !combinedTitle.includes(' - ')) {
        combinedTitle += ` - ${text}`;
        next = next.next();
        continue;
      }

      // Keep verse/paragraph blocks only
      if (['p', 'div'].includes(tag)) {
        const cleaned = cleanContent(text);

        // Skip obvious page noise
        if (
          /USCCB|Get Daily Readings E-mails|En Español|View Calendar|Listen to Podcasts|Watch our Videos/i.test(cleaned)
        ) {
          next = next.next();
          continue;
        }

        content += cleaned + '\n\n';
      }

      next = next.next();
    }

    content = cleanContent(content);

    if (content) {
      readings.push({
        type,
        title: combinedTitle,
        content
      });
    }
  });

  readings.sort((a, b) => readingOrder(a.type) - readingOrder(b.type));

  return readings;
}

async function fetchAndStoreReadings() {
  try {
    const today = getKenyaDate();

    let pageUrl = await fetchRssLinkForToday();

    if (!pageUrl) {
      pageUrl = await fetchDailyPageLinkFallback();
      console.log(`[INFO] RSS did not yield today's item; using fallback page ${pageUrl}`);
    }

    const readings = await parseUsccbDailyPage(pageUrl);

    if (!Array.isArray(readings) || readings.length === 0) {
      console.log('[WARN] No USCCB readings extracted');
      return 0;
    }

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

    console.log(`[SUCCESS] Stored ${readings.length} USCCB readings for ${today}`);
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