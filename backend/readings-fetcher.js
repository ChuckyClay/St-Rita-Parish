const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

function getKenyaNow() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })
  );
}

function getKenyaDate() {
  return getKenyaNow().toISOString().split('T')[0];
}

function getUsccbDateParts(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return { yyyy, mm, dd };
}

function buildUsccbUrl(date) {
  const { yyyy, mm, dd } = getUsccbDateParts(date);
  return `https://bible.usccb.org/bible/readings/${mm}${dd}${yyyy}.cfm`;
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

  if (/Reading\s*I|Reading\s*1|First Reading/i.test(t)) return 'FIRST';
  if (/Responsorial Psalm|Psalm/i.test(t)) return 'PSALM';
  if (/Reading\s*II|Reading\s*2|Second Reading/i.test(t)) return 'SECOND';
  if (/Gospel/i.test(t)) return 'GOSPEL';

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

async function fetchUsccbPageWithFallback() {
  const kenyaNow = getKenyaNow();

  const todayUrl = buildUsccbUrl(kenyaNow);
  let res = await fetch(todayUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; StRitaParishBot/1.0)'
    }
  });

  if (res.status === 404) {
    console.log('[INFO] Today page not available yet, trying yesterday...');

    const yesterday = new Date(kenyaNow);
    yesterday.setDate(yesterday.getDate() - 1);

    const fallbackUrl = buildUsccbUrl(yesterday);
    res = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StRitaParishBot/1.0)'
      }
    });

    if (!res.ok) {
      throw new Error(`Fallback fetch failed: ${res.status}`);
    }

    return {
      html: await res.text(),
      sourceUrl: fallbackUrl
    };
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch USCCB page: ${res.status}`);
  }

  return {
    html: await res.text(),
    sourceUrl: todayUrl
  };
}

function extractReadingsFromPage($) {
  const readings = [];

  $('h2, h3, h4').each((_, el) => {
    const heading = $(el).text().trim();
    const type = classifyReadingTitle(heading);

    if (type === 'OTHER') return;

    let title = heading;
    let content = '';
    let next = $(el).next();

    while (next.length && !/^h2|h3|h4$/i.test(next[0].tagName || '')) {
      const tag = (next[0].tagName || '').toLowerCase();
      const text = next.text().trim();

      if (!text) {
        next = next.next();
        continue;
      }

      // Short citation block, append to title
      if ((tag === 'h4' || tag === 'h5' || tag === 'strong') && text.length < 120) {
        if (!title.includes(' - ') && !/Reading\s*I|Reading\s*II|Psalm|Gospel/i.test(text)) {
          title += ` - ${text}`;
        }
        next = next.next();
        continue;
      }

      // Skip obvious junk
      if (
        /Listen to Podcasts|View Calendar|En Español|Daily Readings|Get Daily Readings E-mails|Reading for the date|Back to Daily Readings/i.test(text)
      ) {
        next = next.next();
        continue;
      }

      if (['p', 'div', 'blockquote'].includes(tag)) {
        content += cleanContent(text) + '\n\n';
      }

      next = next.next();
    }

    content = cleanContent(content);

    if (content) {
      readings.push({ type, title, content });
    }
  });

  return readings;
}

function fallbackExtractReadings($) {
  const readings = [];

  $('p, div').each((_, el) => {
    const text = $(el).text().trim();
    if (!text) return;

    if (/Reading\s*I|Reading\s*1|First Reading/i.test(text)) {
      readings.push({ type: 'FIRST', title: text, content: '' });
      return;
    }

    if (/Responsorial Psalm|Psalm/i.test(text)) {
      readings.push({ type: 'PSALM', title: text, content: '' });
      return;
    }

    if (/Reading\s*II|Reading\s*2|Second Reading/i.test(text)) {
      readings.push({ type: 'SECOND', title: text, content: '' });
      return;
    }

    if (/Gospel/i.test(text)) {
      readings.push({ type: 'GOSPEL', title: text, content: '' });
      return;
    }

    if (readings.length > 0) {
      if (
        !/Listen to Podcasts|View Calendar|En Español|Get Daily Readings E-mails|Back to Daily Readings/i.test(text)
      ) {
        readings[readings.length - 1].content += cleanContent(text) + '\n\n';
      }
    }
  });

  return readings.map(r => ({
    ...r,
    content: cleanContent(r.content)
  }));
}

async function fetchAndStoreReadings() {
  try {
    const today = getKenyaDate();

    const { html, sourceUrl } = await fetchUsccbPageWithFallback();
    console.log(`[INFO] Using USCCB page: ${sourceUrl}`);

    const $ = cheerio.load(html);

    let readings = extractReadingsFromPage($);

    if (!Array.isArray(readings) || readings.length === 0) {
      console.log('[WARN] Primary extraction failed, trying fallback extraction...');
      readings = fallbackExtractReadings($);
    }

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