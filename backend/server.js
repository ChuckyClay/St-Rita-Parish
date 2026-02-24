// TEMP: Manual trigger for readings-fetcher
const fetchAndStoreReadings = require('./readings-fetcher');
app.post('/api/fetch-readings', async (req, res) => {
  try {
    await fetchAndStoreReadings();
    res.json({ success: true, message: 'Readings fetched and stored.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// Simple Express server for St. Rita Parish backend
const express = require('express');
const app = express();
// CORS and JSON middleware must be first
app.use(express.json());
app.use(require('cors')({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}));
const cors = require('cors');
require('dotenv').config();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { router: authRouter, requireAuth } = require('./auth');
const phonesRouter = require('./phones');
const messagesRouter = require('./messages');

const announcementsRouter = require('./announcements');
const eventsRouter = require('./events');



const PORT = process.env.PORT || 3001;


// CORS and JSON middleware must come first
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000', // frontend dev
    'http://127.0.0.1:5500', // local static server (e.g. Live Server)
    // 'https://your-production-domain.com' // production
  ],
  credentials: true
}));



app.use(helmet({
  crossOriginResourcePolicy: false,
}));
// Handle preflight OPTIONS requests for all routes
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

// Place this after all app.use middleware, before any API routes
app.get('/api/test', (req, res) => res.json({ ok: true }));

app.get('/', (req, res) => {
  res.send('St. Rita Parish backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
