const db = require('../config/db');
const { buildAndSaveProfile } = require('./skillEngine');

const RECOMPUTE_THRESHOLD = 3; // recompute after 3 new signals

// Called after every delta sync
// Checks new AC submissions against recommended problems
async function processFeedback(userId, newSubmissions) {
  if (!newSubmissions || newSubmissions.length === 0) return;

  // Get all problem IDs from active recommendation batches for this user
  const batchResult = await db.query(
    `SELECT batch, id FROM recommendations
     WHERE user_id = $1
       AND is_active = TRUE
       AND valid_until > NOW()
     ORDER BY generated_at DESC
     LIMIT 5`,
    [userId]
  );

  if (batchResult.rows.length === 0) return;

  // Build a map of recommended problem_id -> batch info
  const recommendedProblems = {};
  for (const row of batchResult.rows) {
    const batch = row.batch;
    if (!Array.isArray(batch)) continue;
    for (const problem of batch) {
      recommendedProblems[problem.problemId] = {
        batchId: row.id,
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

    // Check if we already logged this
    const existing = await db.query(
      `SELECT id FROM feedback_events
       WHERE user_id = $1 AND problem_id = $2`,
      [userId, problemId]
    );
    if (existing.rows.length > 0) continue;

    // Count how many attempts before this AC
    const attemptsResult = await db.query(
      `SELECT COUNT(*) as attempts FROM submissions
       WHERE user_id = $1
         AND problem_id = $2
         AND submitted_at <= $3`,
      [userId, problemId, sub.submitted_at]
    );
    const attempts = parseInt(attemptsResult.rows[0].attempts);

    const source = sub.is_contest_submission ? 'contest' : 'practice';

    await db.query(
      `INSERT INTO feedback_events
         (user_id, problem_id, batch_id, outcome, attempts, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        problemId,
        isRecommended.batchId,
        'solved',
        attempts,
        source
      ]
    );

    console.log(`Feedback logged: ${problemId} solved in ${attempts} attempts (${source})`);
    newSignals++;
  }

  // Check total unseen signals since last recompute
  const profile = await db.query(
    `SELECT computed_at FROM skill_profiles WHERE user_id = $1`,
    [userId]
  );

  if (profile.rows.length === 0) return;

  const lastComputed = profile.rows[0].computed_at;

  const signalCount = await db.query(
    `SELECT COUNT(*) as count FROM submissions
     WHERE user_id = $1
       AND verdict = 'OK'
       AND created_at > $2`,
    [userId, lastComputed]
  );

  const totalNewSignals = parseInt(signalCount.rows[0].count);

  if (totalNewSignals >= RECOMPUTE_THRESHOLD) {
    console.log(`${totalNewSignals} new signals — triggering profile recompute for user ${userId}`);
    await buildAndSaveProfile(userId);
  }
}

// Save a recommendation batch to DB so feedback can match against it
async function saveRecommendationBatch(userId, batch, validUntil) {
  // Mark old batches inactive
  await db.query(
    `UPDATE recommendations SET is_active = FALSE WHERE user_id = $1`,
    [userId]
  );

  const result = await db.query(
    `INSERT INTO recommendations (user_id, batch, valid_until, is_active)
     VALUES ($1, $2, $3, TRUE)
     RETURNING id`,
    [userId, JSON.stringify(batch), validUntil]
  );

  return result.rows[0].id;
}

module.exports = { processFeedback, saveRecommendationBatch };