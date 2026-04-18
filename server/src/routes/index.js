const express = require('express');
const router = express.Router();
const { syncUser } = require('../jobs/sync');
const { buildAndSaveProfile } = require('../services/skillEngine');
const db = require('../config/db');

router.post('/register', async (req, res) => {
  const { handle } = req.body;
  if (!handle || handle.trim() === '') {
    return res.status(400).json({ error: 'CF handle is required' });
  }
  try {
    const result = await syncUser(handle.trim());
    res.json({
      success: true,
      message: `Synced ${result.submissionsStored} submissions`,
      data: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/user/:handle', async (req, res) => {
  const { handle } = req.params;
  try {
    const result = await db.query(
      `SELECT id, cf_handle, created_at, last_synced_at, sync_status
       FROM users WHERE cf_handle = $1`,
      [handle]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/profile/:handle/compute', async (req, res) => {
  const { handle } = req.params;
  try {
    const userResult = await db.query(
      'SELECT id FROM users WHERE cf_handle = $1',
      [handle]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found. Register first.' });
    }
    const userId = userResult.rows[0].id;
    const profile = await buildAndSaveProfile(userId);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profile/:handle', async (req, res) => {
  const { handle } = req.params;
  try {
    const result = await db.query(
      `SELECT sp.* FROM skill_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE u.cf_handle = $1`,
      [handle]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No profile found. Trigger computation first.'
      });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
const { generateRecommendations } = require('../services/recommendationEngine');

router.get('/recommendations/:handle', async (req, res) => {
  const { handle } = req.params;
  try {
    const userResult = await db.query(
      'SELECT id FROM users WHERE cf_handle = $1', [handle]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const userId = userResult.rows[0].id;
    const batch = await generateRecommendations(userId);
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;