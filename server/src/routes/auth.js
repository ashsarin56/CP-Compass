const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
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
    const emailCheck = await User.findOne({ email });
    if (emailCheck) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Check if already synced recently
    const existing = await User.findOne({ cf_handle: normalizedHandle });

    let userId;
    let currentRating = 0;

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const alreadySynced = existing &&
      existing.sync_status === 'complete' &&
      existing.last_synced_at &&
      new Date(existing.last_synced_at) > sixHoursAgo;

    if (alreadySynced) {
      userId = existing._id;
      console.log(`${normalizedHandle} already synced, skipping re-sync on signup`);
    } else {
      const syncResult = await syncUser(normalizedHandle);
      userId = syncResult.userId;
      currentRating = syncResult.currentRating;
      await buildAndSaveProfile(userId);
    }

    await User.updateOne(
      { _id: userId },
      { email, password_hash: passwordHash }
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
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        error: 'This account was created without a password. Use Google login.'
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user._id, user.cf_handle);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
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
    const user = await User.findById(req.user.userId)
      .select('_id cf_handle email createdAt last_synced_at');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;