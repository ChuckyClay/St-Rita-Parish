const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const ADMIN_USER = 'admin';
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USER) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});

// Middleware to protect routes
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { router, requireAuth };