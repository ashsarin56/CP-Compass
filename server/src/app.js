const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const { connectRedis, disconnectRedis } = require('./config/redis');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_BASE_URL }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function boot() {
  await Promise.all([connectDB(), connectRedis()]);

  app.use('/auth', require('./routes/auth.routes'));
  app.use('/api', require('./routes/index'));

  app.listen(PORT, () => {
    console.log(`CP Compass server running on port ${PORT}`);
  });
}

boot();

const shutdown = async () => {
  console.log('Shutting down...');
  await disconnectRedis();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;