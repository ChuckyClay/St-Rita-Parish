const db = require('./db');
const { translateReadingBlock } = require('./translate');

function getKenyaDate() {
  const now = new Date();
  const kenya = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  return kenya.toISOString().split('T')[0];
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function fetchAndStoreReadingsSw() {
  try {
    const today = getKenyaDate();

    // Get today's English readings
    const englishRows = await dbAll(
      `SELECT * FROM readings WHERE date = ? AND lang = 'en' ORDER BY id ASC`,
      [today]
    );

    if (!englishRows || englishRows.length === 0) {
      console.log('[SW] No English readings found for today. Cannot translate.');
      return 0;
    }

    // Delete any existing Kiswahili readings for today before re-storing
    await dbRun(
      `DELETE FROM readings WHERE date = ? AND lang = 'sw'`,
      [today]
    );

    const translatedRows = [];

    for (const row of englishRows) {
      try {
        console.log(`[SW] Translating: ${row.title}`);

        const translated = await translateReadingBlock({
          title: row.title,
          content: row.content,
          day_title: row.day_title,
        });

        translatedRows.push({
          ...row,
          lang: 'sw',
          title: translated.title,
          content: translated.content,
          day_title: translated.day_title,
          source_name: 'AUTO_TRANSLATED',
        });

        // Small delay between requests to avoid hammering the API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.error(`[SW] Translation failed for "${row.title}":`, err.message);
        throw new Error(`Translation failed: ${err.message}`);
      }
    }

    // Store all translated readings
    for (const row of translatedRows) {
      await dbRun(
        `
        INSERT INTO readings
        (date, lang, section_type, title, content, day_title, lectionary, source_name, source_url, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          today,
          'sw',
          row.section_type,
          row.title,
          row.content,
          row.day_title,
          row.lectionary,
          'AUTO_TRANSLATED',
          row.source_url,
          new Date().toISOString(),
        ]
      );
    }

    console.log(`[SW] Stored ${translatedRows.length} Kiswahili readings for ${today}`);
    return translatedRows.length;

  } catch (err) {
    console.error('[SW] Failed to fetch/store Kiswahili readings:', err.message);
    return 0;
  }
}

if (require.main === module) {
  fetchAndStoreReadingsSw().then(count => {
    console.log(`Translated and stored ${count} Kiswahili readings.`);
  });
}

module.exports = fetchAndStoreReadingsSw;
