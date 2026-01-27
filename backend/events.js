const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const EVENTS_FILE = path.join(__dirname, 'events.json');

// Helper: Read events from file
function readEvents() {
  try {
    const data = fs.readFileSync(EVENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Helper: Write events to file
function writeEvents(data) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2));
}

// Get all events
router.get('/', (req, res) => {
  res.json(readEvents());
});

// Add a new event with validation
router.post(
  '/',
  [
    body('title').isString().trim().notEmpty().withMessage('Title is required.'),
    body('description').isString().trim().notEmpty().withMessage('Description is required.'),
    body('date').isISO8601().withMessage('Date must be ISO8601 format.'),
    body('time').isString().trim().notEmpty().withMessage('Time is required.')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { title, description, date, time } = req.body;
    const events = readEvents();
    const newEvent = { id: Date.now(), title, description, date, time };
    events.unshift(newEvent);
    writeEvents(events);
    res.status(201).json(newEvent);
  }
);

// Delete an event
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  let events = readEvents();
  const initialLen = events.length;
  events = events.filter(e => e.id !== id);
  if (events.length === initialLen) {
    return res.status(404).json({ error: 'Event not found.' });
  }
  writeEvents(events);
  res.json({ success: true });
});

module.exports = router;
