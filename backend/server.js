const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
require('./cron');

// ✅ Correct backup import (ONLY ONCE, correct path)
const {
  backupDatabase,
  listBackups,
  getBackupPath,
  deleteBackup
} = require('./backup');

// Auth & routes
const { router: authRouter, requireAuth } = require('./auth');
const phonesRouter = require('./phones');
const messagesRouter = require('./messages');
const announcementsRouter = require('./announcements');
const eventsRouter = require('./events');
const readingsRouter = require('./readings');
const fetchAndStoreReadings = require('./readings-fetcher');
const fetchAndStoreReadingsSw = require('./readings-fetcher-sw');
const aiRoutes = require('./ai-routes');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// ✅ Rate limiter for login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(express.json());

app.use(cors({
  origin: [
    'https://st-rita-parish-frontend.onrender.com',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRouter);

// Phones
app.use('/api/phones', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'DELETE') {
    return requireAuth(req, res, next);
  }
  next();
}, phonesRouter);

// Messages
app.use('/api/messages', (req, res, next) => {
  if (['GET', 'POST', 'DELETE'].includes(req.method)) {
    return requireAuth(req, res, next);
  }
  next();
}, messagesRouter);

// Announcements
app.use('/api/announcements', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return requireAuth(req, res, next);
  }
  next();
}, announcementsRouter);

// Events
app.use('/api/events', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return requireAuth(req, res, next);
  }
  next();
}, eventsRouter);

// Readings
app.use('/api/readings', readingsRouter);

// AI routes
app.use('/api/ai', aiRoutes);

// Test route
app.get('/api/test', (req, res) => res.json({ ok: true }));

// Root
app.get('/', (req, res) => {
  res.send('St. Rita Parish backend is running!');
});

// Fetch readings
app.post('/api/fetch-readings', requireAuth, async (req, res) => {
  try {
    const count = await fetchAndStoreReadings();
    res.json({
      success: true,
      message: `Readings fetched and stored (${count} readings).`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post('/api/fetch-readings-sw', requireAuth, async (req, res) => {
  try {
    const count = await fetchAndStoreReadingsSw();
    res.json({
      success: true,
      message: `Kiswahili readings fetched and stored (${count} readings).`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


// ================= BACKUP ROUTES =================

// Create backup
app.post('/api/admin/backup-db', requireAuth, async (req, res) => {
  try {
    const result = await backupDatabase();
    res.json({
      success: true,
      message: 'Database backup created successfully.',
      file: result.fileName
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// List backups
app.get('/api/admin/backups', requireAuth, (req, res) => {
  try {
    const backups = listBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Download backup
app.get('/api/admin/backups/:fileName/download', requireAuth, (req, res) => {
  try {
    const filePath = getBackupPath(req.params.fileName);

    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found.'
      });
    }

    res.download(filePath, req.params.fileName);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Delete backup
app.delete('/api/admin/backups/:fileName', requireAuth, (req, res) => {
  try {
    const result = deleteBackup(req.params.fileName);
    res.json(result);
  } catch (err) {
    if (err.message === 'Backup file not found.') {
      return res.status(404).json({
        success: false,
        error: err.message
      });
    }

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});