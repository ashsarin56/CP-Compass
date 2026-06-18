const jwt = require('jsonwebtoken');
const User = require('../models/User');
const syncService = require('../jobs/sync');
const skillEngineService = require('../services/skillEngine');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

function generateToken(userId, handle) {
  return jwt.sign(
    { userId, handle },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

const googleCallback = catchAsync(async (req, res) => {
  const user = req.user;
  const token = generateToken(user._id, user.cf_handle);
  const newUser = !user.cf_handle ? 'true' : 'false';

  res.redirect(
    `${process.env.FRONTEND_BASE_URL}/?token=${token}&newUser=${newUser}`
  );
});

const linkHandle = catchAsync(async (req, res) => {
  const { handle } = req.body;

  if (!handle || handle.trim() === '') {
    throw new AppError('CF handle is required', 400);
  }

  const normalizedHandle = syncService.normalizeHandle(handle);

  const existing = await User.findOne({ cf_handle: normalizedHandle });
  if (existing && existing._id.toString() !== req.user.userId) {
    if (existing.email || existing.google_id || existing.password_hash) {
      throw new AppError('This CF handle is already linked to another account', 409);
    }
    const mongoose = require('mongoose');
    const Submission = require('../models/Submission');
    const SkillProfile = require('../models/SkillProfile');
    
    await Submission.updateMany({ user_id: existing._id }, { user_id: req.user.userId });
    await SkillProfile.findOneAndDelete({ user_id: req.user.userId });
    await SkillProfile.findOneAndUpdate({ user_id: existing._id }, { user_id: req.user.userId });
    await User.findByIdAndDelete(existing._id);
  }
  const syncResult = await syncService.syncUser(normalizedHandle, req.user.userId);
  await skillEngineService.buildAndSaveProfile(syncResult.userId);

  const { delCache } = require('../config/redis');
  await delCache(`profile:${normalizedHandle}`);
  await delCache(`recommendations:${req.user.userId}`);

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { cf_handle: normalizedHandle },
    { returnDocument: 'after' }
  ).select('_id cf_handle email avatar_url auth_provider');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    message: `CF handle ${normalizedHandle} linked successfully`,
    user
  });
});

module.exports = { googleCallback, linkHandle };
