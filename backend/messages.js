// backend/messages.js
// Handles sending messages to subscribers (metadata only, no SMS integration)

const express = require('express');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const MESSAGES_FILE = path.join(__dirname, 'messages.json');

function readMessages() {
  try {
    const data = fs.readFileSync(MESSAGES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeMessages(data) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(data, null, 2));
}

// Get all messages
router.get('/', (req, res) => {
  res.json(readMessages());
});

// Send a message (store metadata)
router.post(
  '/',
  [
    body('message').isString().trim().notEmpty().withMessage('Message is required.')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { message } = req.body;
    const messages = readMessages();
    const newMsg = { id: Date.now(), message, date: new Date().toISOString() };
    messages.unshift(newMsg);
    writeMessages(messages);
    res.status(201).json(newMsg);
  }
);

module.exports = router;
