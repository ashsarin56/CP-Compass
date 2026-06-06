const User = require('../models/User');
const Submission = require('../models/Submission');
const { getUserSubmissions, getUserInfo } = require('../services/cf');
const { processFeedback } = require('../services/feedback');

async function syncUser(cfHandle) {
  try {
    console.log(`Starting sync for: ${cfHandle}`);
    const user = await User.findOneAndUpdate(
      { cf_handle: cfHandle.toUpperCase() },
      { sync_status: 'syncing' },
      { upsert: true, returnDocument: 'after' }
    );
    const userId = user._id;
    const [submissions, userInfo] = await Promise.all([
      getUserSubmissions(cfHandle),
      getUserInfo(cfHandle)
    ]);

    console.log(`Fetched ${submissions.length} submissions from CF`);
    const relevantVerdicts = ['OK', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR'];
    const relevant = submissions.filter(s => relevantVerdicts.includes(s.verdict));

    const newSubmissions = [];
    let inserted = 0;
    const bulkOps = [];
    for (const sub of relevant) {
      const problem = sub.problem;
      const isContest = sub.author?.participantType === 'CONTESTANT';
      const problemId = `${problem.contestId}${problem.index}`;

      bulkOps.push({
        updateOne: {
          filter: { cf_submission_id: sub.id },
          update: {
            $setOnInsert: {
              user_id: userId,
              cf_submission_id: sub.id,
              problem_id: problemId,
              problem_name: problem.name,
              problem_rating: problem.rating || null,
              problem_tags: problem.tags || [],
              verdict: sub.verdict,
              contest_id: sub.contestId || null,
              is_contest_submission: isContest,
              submitted_at: new Date(sub.creationTimeSeconds * 1000)
            }
          },
          upsert: true
        }
      });
    }

    if (bulkOps.length > 0) {
      const result = await Submission.bulkWrite(bulkOps, { ordered: false });
      inserted = result.upsertedCount + result.modifiedCount;
      if (result.upsertedIds) {
        const upsertedCfIds = new Set();
        for (const key of Object.keys(result.upsertedIds)) {
          upsertedCfIds.add(result.upsertedIds[key]);
        }

        for (const sub of relevant) {
          if (sub.verdict === 'OK') {
            const problem = sub.problem;
            const isContest = sub.author?.participantType === 'CONTESTANT';
            const problemId = `${problem.contestId}${problem.index}`;
            newSubmissions.push({
              problem_id: problemId,
              verdict: sub.verdict,
              is_contest_submission: isContest,
              submitted_at: new Date(sub.creationTimeSeconds * 1000)
            });
          }
        }
      }
    }
    await User.updateOne(
      { _id: userId },
      { sync_status: 'complete', last_synced_at: new Date() }
    );

    console.log(`Sync complete for ${cfHandle}: ${inserted} submissions stored`);
    if (newSubmissions.length > 0) {
      await processFeedback(userId, newSubmissions);
    }

    return {
      userId,
      handle: cfHandle,
      currentRating: userInfo.rating || 0,
      submissionsStored: inserted
    };

  } catch (err) {
    await User.updateOne(
      { cf_handle: cfHandle.toUpperCase() },
      { sync_status: 'failed' }
    );
    console.error(`Sync failed for ${cfHandle}:`, err.message);
    throw err;
  }
}

module.exports = { syncUser };