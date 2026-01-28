// backend/media-upload.js
// Handles file uploads for media (images/videos)

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

const upload = multer({ storage });

// POST /api/media/upload - upload one or more files
router.post('/', upload.array('mediaFiles', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }
  // Return file info for frontend to use in metadata save
  const files = req.files.map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    mimetype: f.mimetype,
    path: '/uploads/' + f.filename
  }));
  res.json({ files });
});

module.exports = router;
