const pool = require('./db');

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        cf_handle VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_synced_at TIMESTAMPTZ,
        sync_status VARCHAR(20) DEFAULT 'pending'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        cf_submission_id BIGINT UNIQUE NOT NULL,
        problem_id VARCHAR(50) NOT NULL,
        problem_name VARCHAR(255),
        problem_rating INTEGER,
        problem_tags TEXT[],
        verdict VARCHAR(20),
        contest_id INTEGER,
        is_contest_submission BOOLEAN DEFAULT FALSE,
        submitted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS skill_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        global_estimate INTEGER,
        tag_skills JSONB DEFAULT '{}',
        weakness_vector JSONB DEFAULT '[]',
        computed_at TIMESTAMPTZ DEFAULT NOW(),
        data_window_start TIMESTAMPTZ,
        data_window_end TIMESTAMPTZ,
        submission_count INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        batch JSONB NOT NULL,
        generated_at TIMESTAMPTZ DEFAULT NOW(),
        valid_until TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_submissions_user_id 
        ON submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_problem_tags 
          ON submissions USING GIN(problem_tags);
      CREATE INDEX IF NOT EXISTS idx_submissions_verdict 
        ON submissions(verdict);
      CREATE INDEX IF NOT EXISTS idx_skill_profiles_user_id 
        ON skill_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_recommendations_user_id 
        ON recommendations(user_id);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        problem_id VARCHAR(50) NOT NULL,
        batch_id VARCHAR(100),
        outcome VARCHAR(20) NOT NULL,
        attempts INTEGER DEFAULT 1,
        source VARCHAR(20) DEFAULT 'practice',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feedback_user_id
        ON feedback_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_problem_id
        ON feedback_events(problem_id);
    `);
    await client.query('COMMIT');
    console.log('Migration complete. All 4 tables created.');

    }catch (err) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', err.message);
      throw err;
      } finally {
        client.release();
      }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));