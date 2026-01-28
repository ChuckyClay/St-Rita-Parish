const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const READINGS_FILE = path.join(__dirname, '../readings.json');

// GET /api/readings - Get today's readings
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(READINGS_FILE)) {
      return res.status(404).json({ error: 'Readings not found' });
    }
    const data = JSON.parse(fs.readFileSync(READINGS_FILE, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load readings' });
  }
});

module.exports = router;
