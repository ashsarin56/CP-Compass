const User = require('../models/User');
const SkillProfile = require('../models/SkillProfile');
const syncService = require('../jobs/sync');
const skillEngineService = require('../services/skillEngine');

async function getRadar(req, res) {
  const handle = syncService.normalizeHandle(req.params.handle);

  try {
    const user = await User.findOne({ cf_handle: handle });

    if (!user) {
      await syncService.syncUser(handle);
      const newUser = await User.findOne({ cf_handle: handle });
      const profile = await skillEngineService.buildAndSaveProfile(newUser._id);

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
      const computed = await skillEngineService.buildAndSaveProfile(user._id);
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
}

module.exports = { getRadar };
