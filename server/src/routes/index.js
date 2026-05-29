const express = require('express');
const router = express.Router();
const { syncUser } = require('../jobs/sync');
const { buildAndSaveProfile } = require('../services/skillEngine');
const { generateRecommendations } = require('../services/recommendationEngine');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const SkillProfile = require('../models/SkillProfile');

// POST /api/register
router.post('/register', async (req, res) => {
  const { handle } = req.body;
  if (!handle || handle.trim() === '') {
    return res.status(400).json({ error: 'CF handle is required' });
  }

  const normalizedHandle = handle.trim().toUpperCase();
  try {
    const existing = await User.findOne({ cf_handle: normalizedHandle });

    if (existing) {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      if (
        existing.sync_status === 'complete' &&
        existing.last_synced_at &&
        new Date(existing.last_synced_at) > sixHoursAgo
      ) {
        console.log(`${normalizedHandle} already synced recently, skipping`);
        return res.json({
          success: true,
          message: 'Profile already synced recently',
          data: { userId: existing._id, handle: normalizedHandle, cached: true }
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
    const user = await User.findOne({ cf_handle: handle })
      .select('_id cf_handle createdAt last_synced_at sync_status');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/:handle/compute
router.post('/profile/:handle/compute', authMiddleware, async (req, res) => {
  const handle = req.params.handle.toUpperCase();

  try {
    const user = await User.findOne({ cf_handle: handle });

    if (!user) {
      return res.status(404).json({ error: 'User not found. Register first.' });
    }

    const profile = await buildAndSaveProfile(user._id);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/profile/:handle
router.get('/profile/:handle', async (req, res) => {
  const handle = req.params.handle.toUpperCase();

  try {
    const user = await User.findOne({ cf_handle: handle });
    if (!user) {
      return res.status(404).json({ error: 'No profile found. Trigger computation first.' });
    }

    const profile = await SkillProfile.findOne({ user_id: user._id }).lean();
    if (!profile) {
      return res.status(404).json({ error: 'No profile found. Trigger computation first.' });
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recommendations/:handle
router.get('/recommendations/:handle', authMiddleware, async (req, res) => {
  const handle = req.params.handle.toUpperCase();

  try {
    const user = await User.findOne({ cf_handle: handle });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const batch = await generateRecommendations(user._id);
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/:handle
// trigger a delta sync + feedback processing
router.post('/sync/:handle', authMiddleware, async (req, res) => {
  const handle = req.params.handle.toUpperCase();

  try {
    const user = await User.findOne({ cf_handle: handle });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const result = await syncUser(handle);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/radar/:handle — public, no auth
router.get('/radar/:handle', async (req, res) => {
  const handle = req.params.handle.toUpperCase();

  try {
    const user = await User.findOne({ cf_handle: handle });

    if (!user) {
      // Auto-register — radar works even for first-time visitors
      const syncResult = await syncUser(handle);
      const newUser = await User.findOne({ cf_handle: handle });
      const profile = await buildAndSaveProfile(newUser._id);

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

    const profile = await SkillProfile.findOne({ user_id: user._id }).lean();

    if (!profile) {
      // Profile not computed yet — compute it
      const computed = await buildAndSaveProfile(user._id);
      return res.json({
        success: true,
        data: {
          handle: user.cf_handle,
          globalEstimate: computed.globalEstimate,
          tagSkills: computed.tagSkills,
          weaknesses: computed.weaknesses,
          submissionCount: computed.submissionCount,
          computedAt: new Date().toISOString(),
          isPublic: true
        }
      });
    }

    res.json({
      success: true,
      data: {
        handle: user.cf_handle,
        globalEstimate: profile.global_estimate,
        tagSkills: profile.tag_skills,
        weaknesses: profile.weakness_vector,
        submissionCount: profile.submission_count,
        computedAt: profile.computed_at,
        isPublic: true
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;