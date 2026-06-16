const SkillProfile = require('../models/SkillProfile');
const skillEngineService = require('../services/skillEngine');
const { delCache } = require('../config/redis');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const computeProfile = catchAsync(async (req, res) => {
  const user = await skillEngineService.findUserOrThrow(req.params.handle);
  const profile = await skillEngineService.buildAndSaveProfile(user._id);

  const handle = skillEngineService.normalizeHandle(req.params.handle);
  await delCache(`profile:${handle}`);

  res.json({ success: true, data: profile });
});

const getProfile = catchAsync(async (req, res) => {
  const user = await skillEngineService.findUserOrThrow(req.params.handle);
  const profile = await SkillProfile.findOne({ user_id: user._id }).lean();
  if (!profile) {
    throw new AppError('No profile found. Trigger computation first.', 404);
  }
  res.json({ success: true, data: profile });
});

module.exports = { computeProfile, getProfile };
