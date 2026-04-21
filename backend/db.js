const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'parish.sqlite');
const db = new sqlite3.Database(dbPath);

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function ensureReadingsTable() {
  // Create the old table if it does not exist yet
  await runAsync(`
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL
    );
  `);

  // Inspect current columns
  const columns = await allAsync(`PRAGMA table_info(readings);`);
  const columnNames = new Set(columns.map(c => c.name));

  // Safe additive migration: never drop the table
  if (!columnNames.has('lang')) {
    await runAsync(`ALTER TABLE readings ADD COLUMN lang TEXT DEFAULT 'en';`);
  }

  if (!columnNames.has('section_type')) {
    await runAsync(`ALTER TABLE readings ADD COLUMN section_type TEXT DEFAULT 'OTHER';`);
  }

  if (!columnNames.has('source_name')) {
    await runAsync(`ALTER TABLE readings ADD COLUMN source_name TEXT;`);
  }

  if (!columnNames.has('source_url')) {
    await runAsync(`ALTER TABLE readings ADD COLUMN source_url TEXT;`);
  }

  if (!columnNames.has('fetched_at')) {
    await runAsync(`ALTER TABLE readings ADD COLUMN fetched_at TEXT;`);
  }

  if (!columnNames.has('day_title')) {
    await runAsync(`ALTER TABLE readings ADD COLUMN day_title TEXT;`);
  }

  if (!columnNames.has('lectionary')) {
    await runAsync(`ALTER TABLE readings ADD COLUMN lectionary TEXT;`);
  }

  // Normalize old rows so English keeps working
  await runAsync(`UPDATE readings SET lang = 'en' WHERE lang IS NULL OR TRIM(lang) = '';`);
  await runAsync(`UPDATE readings SET section_type = 'OTHER' WHERE section_type IS NULL OR TRIM(section_type) = '';`);
  await runAsync(`UPDATE readings SET fetched_at = datetime('now') WHERE fetched_at IS NULL OR TRIM(fetched_at) = '';`);
  await runAsync(`UPDATE readings SET day_title = '' WHERE day_title IS NULL OR TRIM(day_title) = '';`);
  await runAsync(`UPDATE readings SET lectionary = '' WHERE lectionary IS NULL OR TRIM(lectionary) = '';`);

  // Prevent duplicate rows per date/language/section going forward
  await runAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_readings_date_lang_section
    ON readings(date, lang, section_type);
  `);
}

async function initDb() {
  try {
    await ensureReadingsTable();

    await runAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        date TEXT NOT NULL
      );
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        date TEXT NOT NULL
      );
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL
      );
    `);

    await runAsync(`
      CREATE TABLE IF NOT EXISTS phones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL UNIQUE
      );
    `);

    console.log('[DB] Initialized successfully');
  } catch (err) {
    console.error('[DB] Initialization error:', err);
  }
}

initDb();

module.exports = db;