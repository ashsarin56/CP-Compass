const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { recommendation, apiWrite } = require('../middleware/rateLimiter');
const { getRecommendations, markSolved } = require('../controllers/recommendation.controller');

router.get('/recommendations/:handle', recommendation, authMiddleware, getRecommendations);
router.post('/recommendations/:handle/mark-solved', apiWrite, authMiddleware, markSolved);

module.exports = router;

