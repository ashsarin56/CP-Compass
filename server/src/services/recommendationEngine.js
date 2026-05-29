const Submission = require('../models/Submission');
const SkillProfile = require('../models/SkillProfile');
const User = require('../models/User');
const axios = require('axios');
const { saveRecommendationBatch } = require('./feedback');

const CF_API_BASE = process.env.CF_API_BASE;

// In-memory cache — fetched once per server restart, refreshed every 6hrs
let problemsetCache = null;
let problemsetCachedAt = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function fetchAndCacheProblems() {
  const now = Date.now();

  if (
    problemsetCache &&
    problemsetCachedAt &&
    now - problemsetCachedAt < CACHE_TTL_MS
  ) {
    console.log('Using cached problemset');
    return problemsetCache;
  }

  const response = await axios.get(`${CF_API_BASE}/problemset.problems`, {
    timeout: 15000
  });

  if (response.data.status !== 'OK') {
    throw new Error('Failed to fetch problemset from CF');
  }

  const problems = response.data.result.problems;
  const stats = response.data.result.problemStatistics;

  const statsMap = {};
  for (const s of stats) {
    statsMap[`${s.contestId}${s.index}`] = s.solvedCount;
  }

  problemsetCache = { problems, statsMap };
  problemsetCachedAt = now;

  console.log(`Fetched ${problems.length} problems from CF and cached`);
  return problemsetCache;
}

function scoreProblem(problem, weakness, userSolvedIds, solvedCount) {
  const { tagRating, tag } = weakness;

  if (!problem.tags.includes(tag)) return -1;

  const problemId = `${problem.contestId}${problem.index}`;
  if (userSolvedIds.has(problemId)) return -1;

  if (!problem.rating) return -1;

  const targetMin = tagRating + 50;
  const targetMax = tagRating + 150;
  const withinZPD = problem.rating >= targetMin && problem.rating <= targetMax;
  if (!withinZPD) return -1;

  let score = 100;

  if (problem.contestId) {
    score += Math.min(problem.contestId / 1000, 30);
  }

  const solves = solvedCount || 0;
  if (solves > 1000) score += 10;
  if (solves > 5000) score += 5;

  return score;
}

function generateThinkingPrompts(problem) {
  const prompts = [];
  const rating = problem.rating || 0;
  const tags = problem.tags || [];

  prompts.push(`What is the constraint on N? What time complexity does it allow?`);

  if (tags.includes('dp')) {
    prompts.push(`What is the state? What does dp[i] represent?`);
  } else if (tags.includes('graphs') || tags.includes('dfs and similar')) {
    prompts.push(`Is this directed or undirected? What traversal makes sense?`);
  } else if (tags.includes('binary search')) {
    prompts.push(`What are you binary searching on — a value or an answer?`);
  } else if (tags.includes('greedy')) {
    prompts.push(`What local choice leads to the global optimum? Can you prove it?`);
  } else if (tags.includes('math') || tags.includes('number theory')) {
    prompts.push(`Is there a mathematical pattern in small cases?`);
  } else if (tags.includes('strings')) {
    prompts.push(`What property of the string are you exploiting — prefix, suffix, frequency?`);
  } else if (tags.includes('sortings')) {
    prompts.push(`Does sorting the input expose a simpler structure to work with?`);
  } else if (tags.includes('brute force')) {
    prompts.push(`What is the brute force? Can you prune it or find the pattern it reveals?`);
  } else {
    prompts.push(`What structure in the input can you exploit?`);
  }

  if (rating >= 1400) {
    prompts.push(`What are the edge cases? Does your solution handle n=1, empty input, max constraints?`);
  }

  return prompts;
}

async function generateRecommendations(userId) {
  // Get skill profile with user handle
  const profile = await SkillProfile.findOne({ user_id: userId }).lean();
  if (!profile) {
    throw new Error('No skill profile found. Run computation first.');
  }

  const user = await User.findById(userId).lean();
  const weaknesses = profile.weakness_vector;
  const globalEstimate = profile.global_estimate;

  if (!weaknesses || weaknesses.length === 0) {
    throw new Error('No weaknesses detected. Profile may need more data.');
  }

  // Get all solved problem IDs
  const solvedIds = await Submission.distinct('problem_id', {
    user_id: userId,
    verdict: 'OK'
  });
  const userSolvedIds = new Set(solvedIds);

  const { problems, statsMap } = await fetchAndCacheProblems();

  const recommendations = [];
  const usedProblemIds = new Set();
  const topWeaknesses = weaknesses.slice(0, 3);

  for (const weakness of topWeaknesses) {
    let bestScore = -1;
    let bestProblem = null;

    for (const problem of problems) {
      const problemId = `${problem.contestId}${problem.index}`;
      if (usedProblemIds.has(problemId)) continue;

      const solvedCount = statsMap[problemId] || 0;
      const score = scoreProblem(problem, weakness, userSolvedIds, solvedCount);

      if (score > bestScore) {
        bestScore = score;
        bestProblem = problem;
      }
    }

    if (bestProblem) {
      const problemId = `${bestProblem.contestId}${bestProblem.index}`;
      usedProblemIds.add(problemId);

      recommendations.push({
        problemId,
        contestId: bestProblem.contestId,
        index: bestProblem.index,
        name: bestProblem.name,
        rating: bestProblem.rating,
        tags: bestProblem.tags,
        targetWeakness: weakness.tag,
        role: weakness.type === 'absolute' ? 'direct_fix' : 'stretch',
        why: `Targets your ${weakness.tag} gap. Your current ${weakness.tag} level is ~${weakness.tagRating}, this problem is rated ${bestProblem.rating} — a reachable stretch.`,
        thinkingPrompts: generateThinkingPrompts(bestProblem),
        url: `https://codeforces.com/problemset/problem/${bestProblem.contestId}/${bestProblem.index}`
      });
    }
  }

  // Save batch to DB so feedback loop can match against it
  await saveRecommendationBatch(userId, recommendations, new Date(Date.now() + 24 * 60 * 60 * 1000));

  return {
    userId,
    handle: user?.cf_handle,
    globalEstimate,
    batch: recommendations,
    generatedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}

module.exports = { generateRecommendations };