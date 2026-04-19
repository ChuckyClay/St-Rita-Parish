// backend/cron.js

const cron = require('node-cron');
const fetchReadings = require('./readings-fetcher');

// Run every 2 hours between 5AM and 1PM
cron.schedule('0 5,7,9,11,13 * * *', async () => {
  console.log('[CRON] Attempting to fetch daily readings...');
  await fetchReadings();
});

console.log('Daily readings cron scheduled.');