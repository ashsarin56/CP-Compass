const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const { connectRedis, disconnectRedis } = require('./config/redis');
const passport = require('./config/passport');
const AppError = require('./utils/AppError');
const errorHandler = require('./middleware/errorHandler');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_BASE_URL }));
app.use(express.json());
app.use(passport.initialize());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function boot() {
  await Promise.all([connectDB(), connectRedis()]);

  app.use('/auth', require('./routes/auth.routes'));
  app.use('/auth', require('./routes/oauth.routes'));
  app.use('/api', require('./routes/index'));

  app.use((req, res, next) => {
    next(new AppError('Route not found', 404));
  });

  app.use(errorHandler);

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

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

module.exports = app;