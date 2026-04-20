const express = require('express');
const router = express.Router();
const { syncUser } = require('../jobs/sync');
const { buildAndSaveProfile } = require('../services/skillEngine');
const { generateRecommendations } = require('../services/recommendationEngine');
const db = require('../config/db');

// POST /api/register
router.post('/register', async (req, res) => {
  const { handle } = req.body;
  if (!handle || handle.trim() === '') {
    return res.status(400).json({ error: 'CF handle is required' });
  }
  
  const normalizedHandle = handle.trim().toUpperCase();
  try {
    const existing = await db.query(
      `SELECT id, last_synced_at, sync_status
       FROM users WHERE cf_handle = $1`,
      [normalizedHandle]
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      if (
        user.sync_status === 'complete' &&
        user.last_synced_at &&
        new Date(user.last_synced_at) > sixHoursAgo
      ) {
        console.log(`${normalizedHandle} already synced recently, skipping`);
        return res.json({
          success: true,
          message: 'Profile already synced recently',
          data: { userId: user.id, handle: normalizedHandle, cached: true }
        });
      }
    }
    const result = await syncUser(normalizedHandle);
    res.json({
      success: true,
      message: `Synced ${result.submissionsStored} submissions`,
      data: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/:handle
router.get('/user/:handle', async (req, res) => {
  const handle = req.params.handle.toUpperCase();
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

// POST /api/profile/:handle/compute
router.post('/profile/:handle/compute', async (req, res) => {
  const handle = req.params.handle.toUpperCase();

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

// GET /api/profile/:handle
router.get('/profile/:handle', async (req, res) => {
  const handle = req.params.handle.toUpperCase();

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

// GET /api/recommendations/:handle
router.get('/recommendations/:handle', async (req, res) => {
  const handle = req.params.handle.toUpperCase();

  try {
    const userResult = await db.query(
      'SELECT id FROM users WHERE cf_handle = $1',
      [handle]
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
// POST /api/sync/:handle
// Manually trigger a delta sync + feedback processing
router.post('/sync/:handle', async (req, res) => {
  const handle = req.params.handle.toUpperCase();

  try {
    const userResult = await db.query(
      'SELECT id FROM users WHERE cf_handle = $1', [handle]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const result = await syncUser(handle);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/radar/:handle', async (req, res) => {
  const handle = req.params.handle.toUpperCase();

  try {
    // Check if we have a computed profile
    const result = await db.query(
      `SELECT sp.global_estimate, sp.tag_skills, sp.weakness_vector,
              sp.computed_at, sp.submission_count, u.cf_handle
       FROM skill_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE u.cf_handle = $1`,
      [handle]
    );

    if (result.rows.length === 0) {
      // Auto-register and compute if not found
      // This makes the radar work even for first-time visitors
      const syncResult = await syncUser(handle);
      const userResult = await db.query(
        'SELECT id FROM users WHERE cf_handle = $1', [handle]
      );
      const userId = userResult.rows[0].id;
      const profile = await buildAndSaveProfile(userId);

      return res.json({
        success: true,
        data: {
          handle,
          globalEstimate: profile.globalEstimate,
          tagSkills: profile.tagSkills,
          weaknesses: profile.weaknesses,
          submissionCount: profile.submissionCount,
          computedAt: new Date().toISOString(),
          isPublic: true
        }
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        handle: row.cf_handle,
        globalEstimate: row.global_estimate,
        tagSkills: row.tag_skills,
        weaknesses: row.weakness_vector,
        submissionCount: row.submission_count,
        computedAt: row.computed_at,
        isPublic: true
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;