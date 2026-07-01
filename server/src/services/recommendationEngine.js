const Submission = require('../models/Submission');
const Recommendation = require('../models/Recommendation');
const SkillProfile = require('../models/SkillProfile');
const User = require('../models/User');
const axios = require('axios');
const feedbackService = require('./feedback');
const cfService = require('./cf');
const skillEngineService = require('./skillEngine');
const { getEffectiveTags } = require('../config/tagRelevance');
const BaseService = require('./BaseService');
const { getCache, setCache, delCache, delCachePattern, CACHE_TTL } = require('../config/redis');

class RecommendationService extends BaseService {
  constructor() {
    super();
  }

  async #fetchAndCacheProblems() {
    const cacheKey = 'problemset:all';
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log('Using cached problemset (Redis)');
      return cached;
    }

    const response = await axios.get(`${this.baseUrl}/problemset.problems`, {
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

    const data = { problems, statsMap };
    await setCache(cacheKey, data, CACHE_TTL.PROBLEMSET);
    console.log(`Fetched ${problems.length} problems from CF and cached in Redis`);
    return data;
  }

  #scoreProblem(problem, weakness, userSolvedIds, solvedCount) {
    const { tagRating, tag } = weakness;
    const effectiveTags = getEffectiveTags(problem.tags, problem.rating);
    if (!effectiveTags.includes(tag)) return -1;

    const problemId = `${problem.contestId}${problem.index}`;
    if (userSolvedIds.has(problemId)) return -1;

    if (!problem.rating) return -1;

    const targetRating = tagRating + 200;
    const sigma = 450;
    
    const ratingWeight = Math.exp(-0.5 * Math.pow((problem.rating - targetRating) / sigma, 2));
    
    let freshness = 1.0;
    if (problem.contestId) {
      freshness = Math.min(problem.contestId / 2000, 1.0);
    }
    
    const solves = solvedCount || 0;
    let popularityBonus = 0;
    if (solves > 1000) popularityBonus += 0.2;
    if (solves > 5000) popularityBonus += 0.1;
    
    const u = 0.3 + Math.random() * 0.1;
    
    return (ratingWeight * 3 + freshness * 1.5 + popularityBonus + u) * 100;
  }

  #generateThinkingPrompts(problem) {
    const prompts = [];
    const rating = problem.rating || 0;
    const tags = getEffectiveTags(problem.tags || [], rating);

    prompts.push(`What is the constraint on N? What time complexity does it allow?`);

    if (tags.includes('dp')) {
      prompts.push(`What is the state? What does dp[i] represent?`);
    } else if (tags.includes('graphs') || tags.includes('dfs and similar')) {
      prompts.push(`Is this directed or undirected? What traversal makes sense?`);
    } else if (tags.includes('binary search')) {
      prompts.push(`What are you binary searching on , a value or an answer?`);
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

  async generateRecommendations(userId) {
    const recoCacheKey = `recommendations:${userId}`;
    const cachedReco = await getCache(recoCacheKey);
    if (cachedReco) {
      console.log(`Cache HIT: ${recoCacheKey}`);
      return cachedReco;
    }

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

    const solvedIds = await Submission.distinct('problem_id', {
      user_id: userId,
      verdict: 'OK'
    });
    const userSolvedIds = new Set(solvedIds);

    const { problems, statsMap } = await this.#fetchAndCacheProblems();

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
        const score = this.#scoreProblem(problem, weakness, userSolvedIds, solvedCount);

        if (score > bestScore) {
          bestScore = score;
          bestProblem = problem;
        }
      }

      if (bestProblem) {
        const problemId = `${bestProblem.contestId}${bestProblem.index}`;
        usedProblemIds.add(problemId);

        const effectiveTags = getEffectiveTags(bestProblem.tags, bestProblem.rating);

        recommendations.push({
          problemId,
          contestId: bestProblem.contestId,
          index: bestProblem.index,
          name: bestProblem.name,
          rating: bestProblem.rating,
          tags: bestProblem.tags,
          effectiveTags,
          targetWeakness: weakness.tag,
          role: weakness.type === 'absolute' ? 'direct_fix' : 'stretch',
          why: `Targets your ${weakness.tag} gap. Your current ${weakness.tag} level is ~${weakness.tagRating}, this problem is rated ${bestProblem.rating} — a reachable stretch.`,
          thinkingPrompts: this.#generateThinkingPrompts(bestProblem),
          url: `https://codeforces.com/problemset/problem/${bestProblem.contestId}/${bestProblem.index}`
        });
      }
    }

    await feedbackService.saveRecommendationBatch(userId, recommendations, new Date(Date.now() + 24 * 60 * 60 * 1000));

    const result = {
      userId,
      handle: user?.cf_handle,
      globalEstimate,
      batch: recommendations,
      generatedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    await setCache(recoCacheKey, result, CACHE_TTL.RECOMMENDATION);
    console.log(`Cache MISS → stored: ${recoCacheKey}`);

    return result;
  }

  async verifySolvedAndReplace(userId, cfHandle, problemId) {
    await delCache(`cf:user.status:${cfHandle}`);

    const cfSubmissions = await cfService.getUserSubmissions(cfHandle);

    const isSolved = cfSubmissions.some(sub => {
      const subProblemId = `${sub.problem.contestId}${sub.problem.index}`;
      return subProblemId === problemId && sub.verdict === 'OK';
    });

    if (!isSolved) {
      return { solved: false, message: 'Not solved yet' };
    }

    console.log(`Problem ${problemId} verified as solved for user ${userId}`);

    const syncService = require('../jobs/sync');
    await syncService.syncUser(cfHandle, userId);

    const recDoc = await Recommendation.findOne({
      user_id: userId,
      is_active: true
    }).sort({ generated_at: -1 });

    if (!recDoc || !Array.isArray(recDoc.batch)) {
      throw new Error('No active recommendation batch found');
    }

    const solvedIndex = recDoc.batch.findIndex(p => p.problemId === problemId);
    if (solvedIndex === -1) {
      return { solved: true, message: 'Problem solved but not in current batch', updatedBatch: recDoc.batch };
    }

    const solvedProblem = recDoc.batch[solvedIndex];
    const targetWeakness = solvedProblem.targetWeakness;

    await feedbackService.recordSolvedEvent(userId, problemId, recDoc._id.toString());

    await skillEngineService.buildAndSaveProfile(userId);

    const excludeIds = new Set(recDoc.batch.map(p => p.problemId));
    const replacement = await this.generateSingleReplacement(userId, targetWeakness, excludeIds);

    const updatedBatch = [...recDoc.batch];
    if (replacement) {
      updatedBatch[solvedIndex] = replacement;
    } else {
      updatedBatch.splice(solvedIndex, 1);
    }

    await Recommendation.findOneAndUpdate(
      { _id: recDoc._id },
      { $set: { batch: updatedBatch } }
    );

    await delCache(`recommendations:${userId}`);
    const normalizedHandle = this.normalizeHandle(cfHandle);
    await delCache(`profile:${normalizedHandle}`);

    console.log(`Replaced problem ${problemId} at index ${solvedIndex} for user ${userId}`);

    return {
      solved: true,
      updatedBatch,
      replacedIndex: solvedIndex,
      newProblem: replacement || null
    };
  }

  async generateSingleReplacement(userId, targetWeaknessTag, excludeIds) {
    const profile = await SkillProfile.findOne({ user_id: userId }).lean();
    if (!profile) return null;

    const weaknesses = profile.weakness_vector || [];
    let weakness = weaknesses.find(w => w.tag === targetWeaknessTag);
    if (!weakness) {
      weakness = weaknesses[0];
      if (!weakness) return null;
    }

    const solvedIds = await Submission.distinct('problem_id', {
      user_id: userId,
      verdict: 'OK'
    });
    const userSolvedIds = new Set(solvedIds);

    const { problems, statsMap } = await this.#fetchAndCacheProblems();

    let bestScore = -1;
    let bestProblem = null;

    for (const problem of problems) {
      const problemId = `${problem.contestId}${problem.index}`;
      if (excludeIds.has(problemId)) continue;

      const solvedCount = statsMap[problemId] || 0;
      const score = this.#scoreProblem(problem, weakness, userSolvedIds, solvedCount);

      if (score > bestScore) {
        bestScore = score;
        bestProblem = problem;
      }
    }

    if (!bestProblem) return null;

    const problemId = `${bestProblem.contestId}${bestProblem.index}`;
    const effectiveTags = getEffectiveTags(bestProblem.tags, bestProblem.rating);

    return {
      problemId,
      contestId: bestProblem.contestId,
      index: bestProblem.index,
      name: bestProblem.name,
      rating: bestProblem.rating,
      tags: bestProblem.tags,
      effectiveTags,
      targetWeakness: weakness.tag,
      role: weakness.type === 'absolute' ? 'direct_fix' : 'stretch',
      why: `Targets your ${weakness.tag} gap. Your current ${weakness.tag} level is ~${weakness.tagRating}, this problem is rated ${bestProblem.rating} — a reachable stretch.`,
      thinkingPrompts: this.#generateThinkingPrompts(bestProblem),
      url: `https://codeforces.com/problemset/problem/${bestProblem.contestId}/${bestProblem.index}`
    };
  }
}

module.exports = new RecommendationService();