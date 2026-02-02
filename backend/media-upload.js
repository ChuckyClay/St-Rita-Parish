// backend/media-upload.js
// Handles file uploads for media (images/videos)


const sharp = require('sharp');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const express = require('express');
const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, base + '-' + Date.now() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max per file
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only image and video files are allowed.'));
    }
    file.originalname = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, true);
  }
});

// POST /api/media/upload - upload one or more files
router.post('/', upload.array('mediaFiles', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }
  const processedFiles = [];
  for (const f of req.files) {
    if (f.mimetype.startsWith('image/')) {
      // Optimize and convert to WebP
      const webpName = f.filename.replace(/\.[^.]+$/, '.webp');
      const webpPath = path.join(UPLOADS_DIR, webpName);
      try {
        await sharp(f.path)
          .resize({ width: 1920, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(webpPath);
        fs.unlinkSync(f.path); // Remove original
        processedFiles.push({
          filename: webpName,
          originalname: f.originalname,
          mimetype: 'image/webp',
          path: '/uploads/' + webpName
        });
      } catch (err) {
        processedFiles.push({
          filename: f.filename,
          originalname: f.originalname,
          mimetype: f.mimetype,
          path: '/uploads/' + f.filename,
          error: 'Image optimization failed.'
        });
      }
    } else {
      // Video: just keep as is
      processedFiles.push({
        filename: f.filename,
        originalname: f.originalname,
        mimetype: f.mimetype,
        path: '/uploads/' + f.filename
      });
    }
  }
  res.json({ files: processedFiles });
});

module.exports = router;
