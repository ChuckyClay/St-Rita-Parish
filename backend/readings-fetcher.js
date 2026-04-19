const fetch = require('node-fetch');
const cheerio = require('cheerio');
const db = require('./db');

function getKenyaNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
}

function getKenyaDate() {
  return getKenyaNow().toISOString().split('T')[0];
}

function getUsccbTodayUrl() {
  const kenya = getKenyaNow();
  const yyyy = kenya.getFullYear();
  const mm = String(kenya.getMonth() + 1).padStart(2, '0');
  const dd = String(kenya.getDate()).padStart(2, '0');
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
  if (/Reading\s*I|Reading\s*1|First Reading/i.test(title)) return 'FIRST';
  if (/Responsorial Psalm|Psalm/i.test(title)) return 'PSALM';
  if (/Reading\s*II|Reading\s*2|Second Reading/i.test(title)) return 'SECOND';
  if (/Gospel/i.test(title)) return 'GOSPEL';
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

async function fetchAndStoreReadings() {
  try {
    const today = getKenyaDate();
    const pageUrl = getUsccbTodayUrl();

    const res = await fetch(pageUrl, {
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

    // Look for section headings
    $('h2, h3, h4').each((_, el) => {
      const heading = $(el).text().trim();
      const type = classifyReadingTitle(heading);

      if (type === 'OTHER') return;

      let title = heading;
      let content = '';
      let next = $(el).next();

      while (next.length && !/^h2|h3|h4$/i.test(next[0].tagName || '')) {
        const text = next.text().trim();

        if (text) {
          // Keep scripture citation as part of title if it looks short
          if ((next[0].tagName === 'h4' || next[0].tagName === 'h5') && text.length < 120) {
            title += ` - ${text}`;
          } else {
            // Skip obvious page junk
            if (!/Listen to Podcasts|View Calendar|En Español|Daily Readings|Get Daily Readings E-mails/i.test(text)) {
              content += text + '\n\n';
            }
          }
        }

        next = next.next();
      }

      content = cleanContent(content);

      if (content) {
        readings.push({ type, title, content });
      }
    });

    // Fallback parsing if heading-based extraction fails
    if (readings.length === 0) {
      $('.content-body p, .content-body div, article p, article div').each((_, el) => {
        const text = $(el).text().trim();
        if (!text) return;

        if (/Reading\s*I|Reading\s*II|Responsorial Psalm|Gospel/i.test(text)) {
          const type = classifyReadingTitle(text);
          readings.push({
            type,
            title: text,
            content: ''
          });
        } else if (readings.length > 0) {
          if (!/Listen to Podcasts|View Calendar|En Español|Get Daily Readings E-mails/i.test(text)) {
            readings[readings.length - 1].content += cleanContent(text) + '\n\n';
          }
        }
      });

      for (const r of readings) {
        r.content = cleanContent(r.content);
      }
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

    console.log(`[SUCCESS] Stored ${filtered.length} USCCB readings for ${today}`);
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