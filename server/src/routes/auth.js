const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { syncUser } = require('../jobs/sync');
const { buildAndSaveProfile } = require('../services/skillEngine');

function generateToken(userId, handle) {
  return jwt.sign(
    { userId, handle },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

// POST /auth/signup
// Body: { handle, email, password }
router.post('/signup', async (req, res) => {
  const { handle, email, password } = req.body;

  if (!handle || !email || !password) {
    return res.status(400).json({ 
      error: 'handle, email and password are required' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      error: 'Password must be at least 6 characters' 
    });
  }

  const normalizedHandle = handle.trim().toUpperCase();

  try {
    const emailCheck = await db.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 12);

    // Check if already synced recently
    const existing = await db.query(
      `SELECT id, last_synced_at, sync_status FROM users WHERE cf_handle = $1`,
      [normalizedHandle]
    );

    let userId;
    let currentRating = 0;

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const alreadySynced = existing.rows.length > 0 &&
      existing.rows[0].sync_status === 'complete' &&
      existing.rows[0].last_synced_at &&
      new Date(existing.rows[0].last_synced_at) > sixHoursAgo;

    if (alreadySynced) {
      userId = existing.rows[0].id;
      console.log(`${normalizedHandle} already synced, skipping re-sync on signup`);
    } else {
      const syncResult = await syncUser(normalizedHandle);
      userId = syncResult.userId;
      currentRating = syncResult.currentRating;
      await buildAndSaveProfile(userId);
    }

    await db.query(
      `UPDATE users 
       SET email = $1, password_hash = $2 
       WHERE id = $3`,
      [email, passwordHash, userId]
    );
    const token = generateToken(userId, normalizedHandle);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        handle: normalizedHandle,
        email,
        currentRating
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/login
// Body: { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await db.query(
      `SELECT id, cf_handle, email, password_hash 
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ 
        error: 'This account was created without a password. Use Google login.' 
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.cf_handle);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        handle: user.cf_handle,
        email: user.email
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/me — verify token + return current user
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, cf_handle, email, created_at, last_synced_at 
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;