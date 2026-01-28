
// Simple Express server for St. Rita Parish backend
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { router: authRouter, requireAuth } = require('./auth');
const phonesRouter = require('./phones');
const messagesRouter = require('./messages');
const mediaRouter = require('./media');
const announcementsRouter = require('./announcements');
const eventsRouter = require('./events');
const mediaUploadRouter = require('./media-upload');
const PORT = process.env.PORT || 3001;

app.use('/api/media/upload', mediaUploadRouter);

app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
}));

// Phones API
app.use('/api/phones', (req, res, next) => {
  if (req.method === 'GET') {
    return requireAuth(req, res, next);
  }
  next();
}, phonesRouter);
// Messages API
app.use('/api/messages', (req, res, next) => {
  if (req.method === 'POST') {
    return requireAuth(req, res, next);
  }
  next();
}, messagesRouter);
// Media API
app.use('/api/media', (req, res, next) => {
  if ((req.method === 'POST' || req.method === 'DELETE')) {
    return requireAuth(req, res, next);
  }
  next();
}, mediaRouter);
app.use(express.json());
app.use(cors());

// Auth API
app.use('/api/auth', authRouter);

// Announcements API
const announcementsRouterPatched = require('./announcements');
app.use('/api/announcements', (req, res, next) => {
  if ((req.method === 'POST' || req.method === 'DELETE')) {
    return requireAuth(req, res, next);
  }
  next();
}, announcementsRouterPatched);
// Events API
const eventsRouterPatched = require('./events');
app.use('/api/events', (req, res, next) => {
  if ((req.method === 'POST' || req.method === 'DELETE')) {
    return requireAuth(req, res, next);
  }
  next();
}, eventsRouterPatched);

// Daily Readings API
const readingsRouter = require('./readings');
app.use('/api/readings', readingsRouter);

app.get('/', (req, res) => {
  res.send('St. Rita Parish backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
