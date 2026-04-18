const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('DB connection failed:', err.message);
    return;
  }
  console.log('PostgreSQL connected');
  release();
});

module.exports = pool;