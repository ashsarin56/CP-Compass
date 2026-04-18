const db = require('../config/db');

// How far back we look (90 days half-life for recency decay)
const RECENCY_HALF_LIFE_DAYS = 90;
const MIN_SAMPLES_FOR_CONFIDENCE = 5;
const WEAKNESS_GAP_THRESHOLD = 150; // tag skill 150 below global = weak

// Recency weight: problems solved recently matter more
// e^(-t / halfLife) where t is days ago
function recencyWeight(submittedAt) {
  const now = Date.now();
  const submittedMs = new Date(submittedAt).getTime();
  const daysAgo = (now - submittedMs) / (1000 * 60 * 60 * 24);
  return Math.exp(-daysAgo / RECENCY_HALF_LIFE_DAYS);
}

// Contest submissions carry more signal than practice
function contestMultiplier(isContest) {
  return isContest ? 1.5 : 1.0;
}

// Core function: build per-tag skill estimates from submissions
async function computeSkillVector(userId) {
  // Fetch all AC submissions with ratings for this user
  const result = await db.query(
    `SELECT problem_tags, problem_rating, is_contest_submission, submitted_at
     FROM submissions
     WHERE user_id = $1
       AND verdict = 'OK'
       AND problem_rating IS NOT NULL
       AND problem_rating > 0
     ORDER BY submitted_at DESC`,
    [userId]
  );

  const submissions = result.rows;

  if (submissions.length === 0) {
    return { tagSkills: {}, globalEstimate: 0, submissionCount: 0 };
  }

  // Accumulate weighted ratings per tag
  // tagData[tag] = { weightedSum, totalWeight, count }
  const tagData = {};

  for (const sub of submissions) {
    const weight = recencyWeight(sub.submitted_at) * 
                   contestMultiplier(sub.is_contest_submission);
    const rating = sub.problem_rating;

    for (const tag of sub.problem_tags) {
      if (!tagData[tag]) {
        tagData[tag] = { weightedSum: 0, totalWeight: 0, count: 0 };
      }
      tagData[tag].weightedSum += rating * weight;
      tagData[tag].totalWeight += weight;
      tagData[tag].count += 1;
    }
  }

  // Convert to skill estimates with confidence levels
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

  // Global estimate: weighted average across all AC submissions
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

// Detect weaknesses: tags where skill is significantly below global
function detectWeaknesses(tagSkills, globalEstimate) {
  // Filter to only medium/high confidence tags
  const reliableTags = Object.entries(tagSkills)
    .filter(([_, data]) => data.confidence !== 'low')
    .sort((a, b) => a[1].rating - b[1].rating); // ascending — weakest first

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

// Also compute WA rate per tag — another weakness signal
async function computeWARates(userId) {
  const result = await db.query(
    `SELECT 
       unnest(problem_tags) as tag,
       COUNT(*) FILTER (WHERE verdict = 'WRONG_ANSWER') as wa_count,
       COUNT(*) as total_count
     FROM submissions
     WHERE user_id = $1
       AND problem_rating IS NOT NULL
     GROUP BY tag
     HAVING COUNT(*) >= 5`,
    [userId]
  );

  const waRates = {};
  for (const row of result.rows) {
    waRates[row.tag] = {
      waRate: parseFloat((row.wa_count / row.total_count).toFixed(2)),
      totalAttempts: parseInt(row.total_count)
    };
  }
  return waRates;
}

// Master function — runs full computation and saves to DB
async function buildAndSaveProfile(userId) {
  console.log(`Computing skill profile for user ${userId}`);

  const [{ tagSkills, globalEstimate, submissionCount }, waRates] =
    await Promise.all([
      computeSkillVector(userId),
      computeWARates(userId)
    ]);

  const weaknesses = detectWeaknesses(tagSkills, globalEstimate);

  // Enrich weaknesses with WA rate data where available
  const enrichedWeaknesses = weaknesses.map(w => ({
    ...w,
    waRate: waRates[w.tag]?.waRate || null
  }));

  // Upsert into skill_profiles
  await db.query(
    `INSERT INTO skill_profiles 
       (user_id, global_estimate, tag_skills, weakness_vector, 
        computed_at, submission_count)
     VALUES ($1, $2, $3, $4, NOW(), $5)
     ON CONFLICT (user_id) 
     DO UPDATE SET
       global_estimate = $2,
       tag_skills = $3,
       weakness_vector = $4,
       computed_at = NOW(),
       submission_count = $5`,
    [
      userId,
      globalEstimate,
      JSON.stringify(tagSkills),
      JSON.stringify(enrichedWeaknesses),
      submissionCount
    ]
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