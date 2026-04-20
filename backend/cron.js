const cron = require('node-cron');
const fetchReadings = require('./readings-fetcher');

// run every 2 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('[CRON] Running hourly fetch...');
  await fetchReadings();
}, {
  timezone: 'Africa/Nairobi'
});

console.log('Cron running every hour (Kenya time)');
