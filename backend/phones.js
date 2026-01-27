// backend/phones.js
// Handles phone number subscriptions (view only, no SMS integration)

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const PHONES_FILE = path.join(__dirname, 'phones.json');

function readPhones() {
  try {
    const data = fs.readFileSync(PHONES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Get all subscribed phone numbers
router.get('/', (req, res) => {
  res.json(readPhones());
});

module.exports = router;
