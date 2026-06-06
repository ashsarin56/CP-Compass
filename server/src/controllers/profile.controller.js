const User = require('../models/User');
const SkillProfile = require('../models/SkillProfile');
const { buildAndSaveProfile } = require('../services/skillEngine');

async function computeProfile(req, res) {
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
}

async function getProfile(req, res) {
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
}

module.exports = { computeProfile, getProfile };
