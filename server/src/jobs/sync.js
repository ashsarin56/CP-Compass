const db = require('../config/db');
const { getUserSubmissions, getUserInfo } = require('../services/cf');

// Main sync function — called on register and by cron
async function syncUser(cfHandle) {
  const client = await db.connect();
  cfHandle = cfHandle.trim().toUpperCase();
  try {
    console.log(`Starting sync for: ${cfHandle}`);

    // Step 1: Get or create user in DB
    const userResult = await client.query(
      `INSERT INTO users (cf_handle, sync_status)
       VALUES ($1, 'syncing')
       ON CONFLICT (cf_handle) 
       DO UPDATE SET sync_status = 'syncing'
       RETURNING id`,
      [cfHandle]
    );
    const userId = userResult.rows[0].id;

    // Step 2: Fetch from CF API
    const [submissions, userInfo] = await Promise.all([
      getUserSubmissions(cfHandle),
      getUserInfo(cfHandle)
    ]);

    console.log(`Fetched ${submissions.length} submissions from CF`);

    // Step 3: Store submissions — only AC and WA verdicts matter for us
    // We filter junk (CE, SKIPPED etc) and store what's analytically useful
    const relevantVerdicts = ['OK', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR'];
    const relevant = submissions.filter(s => relevantVerdicts.includes(s.verdict));

    let inserted = 0;
    for (const sub of relevant) {
      const problem = sub.problem;
      const isContest = sub.author?.participantType === 'CONTESTANT';

      await client.query(
        `INSERT INTO submissions (
          user_id, cf_submission_id, problem_id, problem_name,
          problem_rating, problem_tags, verdict,
          contest_id, is_contest_submission, submitted_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,to_timestamp($10))
        ON CONFLICT (cf_submission_id) DO NOTHING`,
        [
          userId,
          sub.id,
          `${problem.contestId}${problem.index}`,
          problem.name,
          problem.rating || null,
          problem.tags || [],
          sub.verdict,
          sub.contestId || null,
          isContest,
          sub.creationTimeSeconds
        ]
      );
      inserted++;
    }

    // Step 4: Mark sync complete
    await client.query(
      `UPDATE users 
       SET sync_status = 'complete', last_synced_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    console.log(`Sync complete for ${cfHandle}: ${inserted} submissions stored`);

    return {
      userId,
      handle: cfHandle,
      currentRating: userInfo.rating || 0,
      submissionsStored: inserted
    };

  } catch (err) {
    // Mark sync as failed so we can retry
    await client.query(
      `UPDATE users SET sync_status = 'failed' WHERE cf_handle = $1`,
      [cfHandle]
    );
    console.error(`Sync failed for ${cfHandle}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { syncUser };