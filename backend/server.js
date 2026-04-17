const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { router: authRouter, requireAuth } = require('./auth');
const phonesRouter = require('./phones');
const messagesRouter = require('./messages');
const announcementsRouter = require('./announcements');
const eventsRouter = require('./events');
const readingsRouter = require('./readings');
const fetchAndStoreReadings = require('./readings-fetcher');

const app = express();
const PORT = process.env.PORT || 3001;

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

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use('/api/auth', authRouter);

app.use('/api/phones', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'DELETE') {
    return requireAuth(req, res, next);
  }
  next();
}, phonesRouter);

app.use('/api/messages', (req, res, next) => {
  if (['GET', 'POST', 'DELETE'].includes(req.method)) {
    return requireAuth(req, res, next);
  }
  next();
}, messagesRouter);

app.use('/api/announcements', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return requireAuth(req, res, next);
  }
  next();
}, announcementsRouter);

app.use('/api/events', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return requireAuth(req, res, next);
  }
  next();
}, eventsRouter);

app.use('/api/readings', readingsRouter);

app.get('/api/test', (req, res) => res.json({ ok: true }));

app.get('/', (req, res) => {
  res.send('St. Rita Parish backend is running!');
});

app.post('/api/fetch-readings', requireAuth, async (req, res) => {
  try {
    const count = await fetchAndStoreReadings();
    res.json({ success: true, message: `Readings fetched and stored (${count} readings).` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});