const Submission = require('../models/Submission');
const SkillProfile = require('../models/SkillProfile');
const { getEffectiveTags } = require('../config/tagRelevance');
const BaseService = require('./BaseService');

class SkillEngineService extends BaseService {
  #recencyHalfLifeDays;
  #minSamplesForConfidence;
  #weaknessGapThreshold;

  constructor() {
    super();
    this.#recencyHalfLifeDays = 90;
    this.#minSamplesForConfidence = 5;
    this.#weaknessGapThreshold = 150;
  }

  get recencyHalfLifeDays() {
    return this.#recencyHalfLifeDays;
  }

  get minSamplesForConfidence() {
    return this.#minSamplesForConfidence;
  }

  get weaknessGapThreshold() {
    return this.#weaknessGapThreshold;
  }

  #recencyWeight(submittedAt) {
    const now = Date.now();
    const submittedMs = new Date(submittedAt).getTime();
    const daysAgo = (now - submittedMs) / (1000 * 60 * 60 * 24);
    return Math.exp(-daysAgo / this.#recencyHalfLifeDays);
  }

  #contestMultiplier(isContest) {
    return isContest ? 1.5 : 1.0;
  }

  async computeSkillVector(userId) {
    const submissions = await Submission.find({
      user_id: userId,
      verdict: 'OK',
      problem_rating: { $gt: 0, $ne: null }
    }).sort({ submitted_at: -1 }).lean();

    if (submissions.length === 0) {
      return { tagSkills: {}, globalEstimate: 0, submissionCount: 0 };
    }

    const tagData = {};

    for (const sub of submissions) {
      const weight = this.#recencyWeight(sub.submitted_at) *
                     this.#contestMultiplier(sub.is_contest_submission);
      const rating = sub.problem_rating;
      const effectiveTags = getEffectiveTags(sub.problem_tags, rating);

      for (const tag of effectiveTags) {
        if (!tagData[tag]) {
          tagData[tag] = { weightedSum: 0, totalWeight: 0, count: 0 };
        }
        tagData[tag].weightedSum += rating * weight;
        tagData[tag].totalWeight += weight;
        tagData[tag].count += 1;
      }
    }

    const tagSkills = {};
    for (const [tag, data] of Object.entries(tagData)) {
      const estimatedRating = Math.round(data.weightedSum / data.totalWeight);
      let confidence;
      if (data.count >= 20) confidence = 'high';
      else if (data.count >= this.#minSamplesForConfidence) confidence = 'medium';
      else confidence = 'low';

      tagSkills[tag] = {
        rating: estimatedRating,
        confidence,
        sampleSize: data.count
      };
    }

    let globalWeightedSum = 0;
    let globalTotalWeight = 0;
    for (const sub of submissions) {
      const weight = this.#recencyWeight(sub.submitted_at) *
                     this.#contestMultiplier(sub.is_contest_submission);
      globalWeightedSum += sub.problem_rating * weight;
      globalTotalWeight += weight;
    }
    const globalEstimate = Math.round(globalWeightedSum / globalTotalWeight);

    return { tagSkills, globalEstimate, submissionCount: submissions.length };
  }

  detectWeaknesses(tagSkills, globalEstimate) {
    const reliableTags = Object.entries(tagSkills)
      .filter(([_, data]) => data.confidence !== 'low')
      .sort((a, b) => a[1].rating - b[1].rating);

    if (reliableTags.length === 0) return [];

    const weaknesses = [];

    for (let i = 0; i < reliableTags.length; i++) {
      const [tag, data] = reliableTags[i];
      const gap = globalEstimate - data.rating;
      const isAbsoluteWeak = gap >= this.#weaknessGapThreshold;
      const isBottomThree = i < 3;

      if (isAbsoluteWeak || isBottomThree) {
        weaknesses.push({
          tag,
          tagRating: data.rating,
          globalEstimate,
          gap,
          confidence: data.confidence,
          sampleSize: data.sampleSize,
          type: isAbsoluteWeak ? 'absolute' : 'relative',
          explanation: isAbsoluteWeak
            ? `Your ${tag} rating is ~${data.rating}, which is ${gap} points below your overall level of ${globalEstimate}. Based on ${data.sampleSize} problems.`
            : `${tag} is your relatively weakest area at ~${data.rating} (your overall is ${globalEstimate}). Good next target.`
        });
      }
    }
    return weaknesses.sort((a, b) => b.gap - a.gap);
  }

  async computeWARates(userId) {
    const submissions = await Submission.find({
      user_id: userId,
      problem_rating: { $ne: null }
    }).select('problem_tags problem_rating verdict').lean();

    const tagCounts = {};

    for (const sub of submissions) {
      const effectiveTags = getEffectiveTags(sub.problem_tags, sub.problem_rating);
      for (const tag of effectiveTags) {
        if (!tagCounts[tag]) tagCounts[tag] = { wa: 0, total: 0 };
        tagCounts[tag].total += 1;
        if (sub.verdict === 'WRONG_ANSWER') tagCounts[tag].wa += 1;
      }
    }

    const waRates = {};
    for (const [tag, counts] of Object.entries(tagCounts)) {
      if (counts.total < 5) continue;
      waRates[tag] = {
        waRate: parseFloat((counts.wa / counts.total).toFixed(2)),
        totalAttempts: counts.total
      };
    }
    return waRates;
  }

  async buildAndSaveProfile(userId) {
    console.log(`Computing skill profile for user ${userId}`);

    const [{ tagSkills, globalEstimate, submissionCount }, waRates] =
      await Promise.all([
        this.computeSkillVector(userId),
        this.computeWARates(userId)
      ]);

    const weaknesses = this.detectWeaknesses(tagSkills, globalEstimate);

    const enrichedWeaknesses = weaknesses.map(w => ({
      ...w,
      waRate: waRates[w.tag]?.waRate || null
    }));

    await SkillProfile.findOneAndUpdate(
      { user_id: userId },
      {
        global_estimate: globalEstimate,
        tag_skills: tagSkills,
        weakness_vector: enrichedWeaknesses,
        computed_at: new Date(),
        submission_count: submissionCount
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`Profile saved: global=${globalEstimate}, weaknesses=${enrichedWeaknesses.length}`);

    return {
      globalEstimate,
      tagSkills,
      weaknesses: enrichedWeaknesses,
      submissionCount
    };
  }
}

module.exports = new SkillEngineService();