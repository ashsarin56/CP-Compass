const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getRecommendations } = require('../controllers/recommendation.controller');
router.get('/recommendations/:handle', authMiddleware, getRecommendations);
module.exports = router;
