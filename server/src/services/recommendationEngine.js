const db = require('../config/db');

const CF_API_BASE = process.env.CF_API_BASE;
const axios = require('axios');

// Fetch full problemset from CF and cache it in DB
// We call this once and store — not on every request
async function fetchAndCacheProblems() {
  const response = await axios.get(`${CF_API_BASE}/problemset.problems`, {
    timeout: 15000
  });

  if (response.data.status !== 'OK') {
    throw new Error('Failed to fetch problemset from CF');
  }

  const problems = response.data.result.problems;
  const stats = response.data.result.problemStatistics;

  // Build stats map for quick lookup
  const statsMap = {};
  for (const s of stats) {
    statsMap[`${s.contestId}${s.index}`] = s.solvedCount;
  }

  console.log(`Fetched ${problems.length} problems from CF`);
  return { problems, statsMap };
}

// Core scoring function — how good is this problem for this user?
function scoreProblem(problem, weakness, userSolvedIds, solvedCount) {
  const { tagRating, tag } = weakness;

  // Must contain the weak tag
  if (!problem.tags.includes(tag)) return -1;

  // Must not be already solved
  const problemId = `${problem.contestId}${problem.index}`;
  if (userSolvedIds.has(problemId)) return -1;

  // Must have a rating
  if (!problem.rating) return -1;

  // ZPD fit: target skill + 50 to 150 above current tag rating
  const targetMin = tagRating + 50;
  const targetMax = tagRating + 150;
  const withinZPD = problem.rating >= targetMin && problem.rating <= targetMax;
  if (!withinZPD) return -1;

  let score = 100;

  // Freshness: prefer higher contest IDs (more recent)
  if (problem.contestId) {
    score += Math.min(problem.contestId / 1000, 30); // up to +30
  }

  // Popularity: problems with more solves are better validated
  const solves = solvedCount || 0;
  if (solves > 1000) score += 10;
  if (solves > 5000) score += 5;

  // Div3/Div4 problems are less interesting (contest IDs pattern)
  // We can't perfectly detect this without contest data, skip for now

  return score;
}

// Generate thinking prompts based on problem constraints
// This is the structured thinking layer — not hints, constraint analysis
function generateThinkingPrompts(problem) {
  const prompts = [];
  const rating = problem.rating || 0;
  const tags = problem.tags || [];

  prompts.push(`What is the constraint on N? What time complexity does it allow?`);

  if (tags.includes('dp')) {
    prompts.push(`What is the state? What does dp[i] represent?`);
  } else if (tags.includes('graphs') || tags.includes('dfs and similar')) {
    prompts.push(`Is this a directed or undirected graph problem? What traversal makes sense?`);
  } else if (tags.includes('binary search')) {
    prompts.push(`What are you binary searching on — a value or an answer?`);
  } else if (tags.includes('greedy')) {
    prompts.push(`What local choice leads to the global optimum? Can you prove it?`);
  } else if (tags.includes('math') || tags.includes('number theory')) {
    prompts.push(`Is there a mathematical pattern in small cases?`);
  } else {
    prompts.push(`What structure in the input can you exploit?`);
  }

  if (rating >= 1400) {
    prompts.push(`What happens at the boundary/edge cases? Does your solution handle n=1, empty input, max constraints?`);
  }

  return prompts;
}

// Main function: generate recommendation batch for a user
async function generateRecommendations(userId) {
  // Step 1: Get user's skill profile
  const profileResult = await db.query(
    `SELECT sp.*, u.cf_handle 
     FROM skill_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.user_id = $1`,
    [userId]
  );

  if (profileResult.rows.length === 0) {
    throw new Error('No skill profile found. Run computation first.');
  }

  const profile = profileResult.rows[0];
  const weaknesses = profile.weakness_vector;
  const globalEstimate = profile.global_estimate;

  if (!weaknesses || weaknesses.length === 0) {
    throw new Error('No weaknesses detected. Profile may need more data.');
  }

  // Step 2: Get all problems user already solved
  const solvedResult = await db.query(
    `SELECT DISTINCT problem_id FROM submissions
     WHERE user_id = $1 AND verdict = 'OK'`,
    [userId]
  );
  const userSolvedIds = new Set(solvedResult.rows.map(r => r.problem_id));

  // Step 3: Fetch problemset from CF
  const { problems, statsMap } = await fetchAndCacheProblems();

  // Step 4: For each weakness, find best matching problems
  const recommendations = [];
  const usedProblemIds = new Set();

  // Take top 3 weaknesses max
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

  // Step 5: Save batch to DB (we'll add recommendations table next)
  return {
    userId,
    handle: profile.cf_handle,
    globalEstimate,
    batch: recommendations,
    generatedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}

module.exports = { generateRecommendations };