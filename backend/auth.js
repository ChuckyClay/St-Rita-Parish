const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// In a real app, store this in a database or environment variable
const ADMIN_USER = 'admin';
// Password: 'stRita2026' (hashed)
const ADMIN_PASS_HASH = '$2a$10$wQwQwQwQwQwQwQwQwQwQwOQwQwQwQwQwQwQwQwQwQwQwQwQwQwQw';
const JWT_SECRET = 'your_jwt_secret_key'; // Use a strong secret in production

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USER) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // For demo, accept any password (replace with bcrypt.compare in real use)
  // const valid = await bcrypt.compare(password, ADMIN_PASS_HASH);
  const valid = password === 'stRita2026';
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
  const JWT_SECRET = process.env.JWT_SECRET; // Use a strong secret in production
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // Use a strong password in production

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
});