// backend/cron.js
// Schedules daily readings fetch at 1am server time

const cron = require('node-cron');
const fetchReadings = require('./readings-fetcher');

// Schedule to run every day at 1:00 AM
cron.schedule('0 1 * * *', () => {
  console.log('Fetching daily readings...');
  fetchReadings();
});

console.log('Daily readings cron job scheduled.');
