// backend/readings-fetcher.js
// Fetches daily Catholic readings from an external API and updates readings.json

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const READINGS_FILE = path.join(__dirname, '../readings.json');

async function fetchReadings() {
  // Example API: https://catholic-api.fly.dev/api/v1/readings/daily (replace with a real, stable API for production)
  const apiUrl = 'https://catholic-api.fly.dev/api/v1/readings/daily';
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error('Failed to fetch readings');
    const data = await res.json();
    // Transform data as needed to match your readings.json structure
    const readings = {
      date: data.date,
      firstReading: {
        en: { title: data.first_reading.title, text: data.first_reading.text },
        sw: { title: '', text: '' } // Add Swahili if available
      },
      psalm: {
        en: { title: data.psalm.title, text: data.psalm.text },
        sw: { title: '', text: '' }
      },
      gospel: {
        en: { title: data.gospel.title, text: data.gospel.text },
        sw: { title: '', text: '' }
      }
    };
    fs.writeFileSync(READINGS_FILE, JSON.stringify(readings, null, 2));
    console.log('Daily readings updated:', readings.date);
  } catch (err) {
    console.error('Error fetching readings:', err.message);
  }
}

if (require.main === module) {
  fetchReadings();
}

module.exports = fetchReadings;
