const SkillProfile = require('../models/SkillProfile');
const skillEngineService = require('../services/skillEngine');

async function computeProfile(req, res) {
  try {
    const user = await skillEngineService.findUserOrThrow(req.params.handle);
    const profile = await skillEngineService.buildAndSaveProfile(user._id);
    res.json({ success: true, data: profile });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
}

async function getProfile(req, res) {
  try {
    const user = await skillEngineService.findUserOrThrow(req.params.handle);
    const profile = await SkillProfile.findOne({ user_id: user._id }).lean();
    if (!profile) {
      return res.status(404).json({ error: 'No profile found. Trigger computation first.' });
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
}

module.exports = { computeProfile, getProfile };
