const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { authStrict, authMe } = require('../middleware/rateLimiter');
const { signup, login, me } = require('../controllers/auth.controller');

router.post('/signup', authStrict, signup);
router.post('/login', authStrict, login);
router.get('/me', authMe, authMiddleware, me);

module.exports = router;
