
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'parish.sqlite');
const db = new sqlite3.Database(dbPath);

// Create readings table if not exists
const createReadings = `CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL
);`;
db.run(createReadings);

// Create messages table if not exists
const createMessages = `CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  date TEXT NOT NULL
);`;
db.run(createMessages);

// Create announcements table if not exists
const createAnnouncements = `CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL
);`;
db.run(createAnnouncements);

// Create events table if not exists
const createEvents = `CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL
);`;
db.run(createEvents);

// Create phones table if not exists
const createPhones = `CREATE TABLE IF NOT EXISTS phones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE
);`;
db.run(createPhones);

module.exports = db;
