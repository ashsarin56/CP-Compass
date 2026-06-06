const Recommendation = require('../models/Recommendation');
const Submission = require('../models/Submission');
const SkillProfile = require('../models/SkillProfile');
const FeedbackEvent = require('../models/FeedbackEvent');
const BaseService = require('./BaseService');

class FeedbackService extends BaseService {
  #recomputeThreshold;

  constructor() {
    super();
    this.#recomputeThreshold = 3;
  }

  get recomputeThreshold() {
    return this.#recomputeThreshold;
  }

  async processFeedback(userId, newSubmissions) {
    if (!newSubmissions || newSubmissions.length === 0) return;

    const skillEngineService = require('./skillEngine');

    const batches = await Recommendation.find({
      user_id: userId,
      is_active: true,
      valid_until: { $gt: new Date() }
    }).sort({ generated_at: -1 }).limit(5).lean();

    if (batches.length === 0) return;

    const recommendedProblems = {};
    for (const row of batches) {
      const batch = row.batch;
      if (!Array.isArray(batch)) continue;
      for (const problem of batch) {
        recommendedProblems[problem.problemId] = {
          batchId: row._id.toString(),
          role: problem.role,
          targetWeakness: problem.targetWeakness
        };
      }
    }

    let newSignals = 0;

    for (const sub of newSubmissions) {
      const problemId = sub.problem_id;
      const isRecommended = recommendedProblems[problemId];

      if (!isRecommended) continue;
      if (sub.verdict !== 'OK') continue;

      const existing = await FeedbackEvent.findOne({
        user_id: userId,
        problem_id: problemId
      });
      if (existing) continue;

      const attempts = await Submission.countDocuments({
        user_id: userId,
        problem_id: problemId,
        submitted_at: { $lte: sub.submitted_at }
      });

      const source = sub.is_contest_submission ? 'contest' : 'practice';

      await FeedbackEvent.create({
        user_id: userId,
        problem_id: problemId,
        batch_id: isRecommended.batchId,
        outcome: 'solved',
        attempts,
        source
      });

      console.log(`Feedback logged: ${problemId} solved in ${attempts} attempts (${source})`);
      newSignals++;
    }

    const profile = await SkillProfile.findOne({ user_id: userId }).lean();
    if (!profile) return;

    const lastComputed = profile.computed_at;

    const totalNewSignals = await Submission.countDocuments({
      user_id: userId,
      verdict: 'OK',
      createdAt: { $gt: lastComputed }
    });

    if (totalNewSignals >= this.#recomputeThreshold) {
      console.log(`${totalNewSignals} new signals — triggering profile recompute for user ${userId}`);
      await skillEngineService.buildAndSaveProfile(userId);
    }
  }

  async saveRecommendationBatch(userId, batch, validUntil) {
    await Recommendation.updateMany(
      { user_id: userId },
      { is_active: false }
    );

    const rec = await Recommendation.create({
      user_id: userId,
      batch,
      valid_until: validUntil,
      is_active: true
    });

    return rec._id.toString();
  }
}

module.exports = new FeedbackService();