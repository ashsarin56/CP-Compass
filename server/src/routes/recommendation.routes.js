const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { recommendation } = require('../middleware/rateLimiter');
const { getRecommendations } = require('../controllers/recommendation.controller');

router.get('/recommendations/:handle', recommendation, authMiddleware, getRecommendations);

module.exports = router;
