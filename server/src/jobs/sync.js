const db = require('../config/db');
const { getUserSubmissions, getUserInfo } = require('../services/cf');
const { processFeedback } = require('../services/feedback');

async function syncUser(cfHandle) {
  const client = await db.connect();
  try {
    console.log(`Starting sync for: ${cfHandle}`);

    const userResult = await client.query(
      `INSERT INTO users (cf_handle, sync_status)
       VALUES ($1, 'syncing')
       ON CONFLICT (cf_handle)
       DO UPDATE SET sync_status = 'syncing'
       RETURNING id`,
      [cfHandle.toUpperCase()]
    );
    const userId = userResult.rows[0].id;

    const [submissions, userInfo] = await Promise.all([
      getUserSubmissions(cfHandle),
      getUserInfo(cfHandle)
    ]);

    console.log(`Fetched ${submissions.length} submissions from CF`);

    const relevantVerdicts = ['OK', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR'];
    const relevant = submissions.filter(s => relevantVerdicts.includes(s.verdict));

    const newSubmissions = [];
    let inserted = 0;

    for (const sub of relevant) {
      const problem = sub.problem;
      const isContest = sub.author?.participantType === 'CONTESTANT';
      const problemId = `${problem.contestId}${problem.index}`;

      const result = await client.query(
        `INSERT INTO submissions (
          user_id, cf_submission_id, problem_id, problem_name,
          problem_rating, problem_tags, verdict,
          contest_id, is_contest_submission, submitted_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,to_timestamp($10))
        ON CONFLICT (cf_submission_id) DO NOTHING
        RETURNING id`,
        [
          userId,
          sub.id,
          problemId,
          problem.name,
          problem.rating || null,
          problem.tags || [],
          sub.verdict,
          sub.contestId || null,
          isContest,
          sub.creationTimeSeconds
        ]
      );

      // Track newly inserted submissions for feedback processing
      if (result.rows.length > 0 && sub.verdict === 'OK') {
        newSubmissions.push({
          problem_id: problemId,
          verdict: sub.verdict,
          is_contest_submission: isContest,
          submitted_at: new Date(sub.creationTimeSeconds * 1000)
        });
      }
      inserted++;
    }

    await client.query(
      `UPDATE users
       SET sync_status = 'complete', last_synced_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    client.release();

    console.log(`Sync complete for ${cfHandle}: ${inserted} submissions stored`);

    // Process feedback after client is released
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
    await client.query(
      `UPDATE users SET sync_status = 'failed' WHERE cf_handle = $1`,
      [cfHandle.toUpperCase()]
    );
    client.release();
    console.error(`Sync failed for ${cfHandle}:`, err.message);
    throw err;
  }
}

module.exports = { syncUser };