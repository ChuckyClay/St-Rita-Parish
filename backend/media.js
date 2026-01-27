// backend/media.js
// Handles media uploads (image/video metadata)

const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const MEDIA_FILE = path.join(__dirname, '../gallery.json');

function readMedia() {
  try {
    const data = fs.readFileSync(MEDIA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeMedia(data) {
  fs.writeFileSync(MEDIA_FILE, JSON.stringify(data, null, 2));
}

// Get all media
router.get('/', (req, res) => {
  res.json(readMedia());
});

// Add new media (image/video metadata)
router.post(
  '/',
  [
    body('type').isIn(['image', 'video']).withMessage('Type must be image or video.'),
    body('src').isString().trim().notEmpty().withMessage('Source is required.'),
    body('caption').isString().trim().notEmpty().withMessage('Caption is required.'),
    body('event').isString().trim().notEmpty().withMessage('Event is required.'),
    body('date').isISO8601().withMessage('Date must be ISO8601 format.')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { type, src, caption, event, date } = req.body;
    const media = readMedia();
    const newMedia = { id: Date.now(), type, src, caption, event, date };
    media.push(newMedia);
    writeMedia(media);
    res.status(201).json(newMedia);
  }
);

// Delete media by id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  let media = readMedia();
  const initialLen = media.length;
  media = media.filter(m => m.id !== id);
  if (media.length === initialLen) {
    return res.status(404).json({ error: 'Media not found.' });
  }
  writeMedia(media);
  res.json({ success: true });
});

module.exports = router;
