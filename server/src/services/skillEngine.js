const Submission = require('../models/Submission');
const SkillProfile = require('../models/SkillProfile');
const { getEffectiveTags } = require('../config/tagRelevance');

const RECENCY_HALF_LIFE_DAYS = 90;
const MIN_SAMPLES_FOR_CONFIDENCE = 5;
const WEAKNESS_GAP_THRESHOLD = 150; 

//e^(-t / halfLife) where t is days ago
function recencyWeight(submittedAt) {
  const now = Date.now();
  const submittedMs = new Date(submittedAt).getTime();
  const daysAgo = (now - submittedMs) / (1000 * 60 * 60 * 24);
  return Math.exp(-daysAgo / RECENCY_HALF_LIFE_DAYS);
}

function contestMultiplier(isContest) {
  return isContest ? 1.5 : 1.0;
}
async function computeSkillVector(userId) {
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
    const weight = recencyWeight(sub.submitted_at) *
                   contestMultiplier(sub.is_contest_submission);
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
    else if (data.count >= MIN_SAMPLES_FOR_CONFIDENCE) confidence = 'medium';
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
    const weight = recencyWeight(sub.submitted_at) *
                   contestMultiplier(sub.is_contest_submission);
    globalWeightedSum += sub.problem_rating * weight;
    globalTotalWeight += weight;
  }
  const globalEstimate = Math.round(globalWeightedSum / globalTotalWeight);

  return { tagSkills, globalEstimate, submissionCount: submissions.length };
}

function detectWeaknesses(tagSkills, globalEstimate) {
  const reliableTags = Object.entries(tagSkills)
    .filter(([_, data]) => data.confidence !== 'low')
    .sort((a, b) => a[1].rating - b[1].rating); 

  if (reliableTags.length === 0) return [];

  const weaknesses = [];

  for (let i = 0; i < reliableTags.length; i++) {
    const [tag, data] = reliableTags[i];
    const gap = globalEstimate - data.rating;
    const isAbsoluteWeak = gap >= 150;
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
async function computeWARates(userId) {
  const submissions = await Submission.find({
    user_id: userId,
    problem_rating: { $ne: null }
  }).select('problem_tags problem_rating verdict').lean();

  const tagCounts = {}; //tag → { wa: N, total: N }

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
async function buildAndSaveProfile(userId) {
  console.log(`Computing skill profile for user ${userId}`);

  const [{ tagSkills, globalEstimate, submissionCount }, waRates] =
    await Promise.all([
      computeSkillVector(userId),
      computeWARates(userId)
    ]);

  const weaknesses = detectWeaknesses(tagSkills, globalEstimate);

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
module.exports = { buildAndSaveProfile, computeSkillVector, detectWeaknesses };