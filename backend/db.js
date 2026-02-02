// SQLite database setup for St. Rita Parish
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'parish.sqlite');
const db = new sqlite3.Database(dbPath);

// Create announcements table if not exists
const createAnnouncements = `
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL
);
`;
db.run(createAnnouncements);

// Create events table if not exists
const createEvents = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL
);
`;
db.run(createEvents);


// Create media table if not exists
const createMedia = `
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('image', 'video')),
  src TEXT NOT NULL,
  caption TEXT NOT NULL,
  event TEXT NOT NULL,
  date TEXT NOT NULL
);
`;
db.run(createMedia);

module.exports = db;
