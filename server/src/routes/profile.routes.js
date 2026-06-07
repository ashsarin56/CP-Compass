const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { apiWrite, apiGeneral } = require('../middleware/rateLimiter');
const cacheMiddleware = require('../middleware/cache');
const { CACHE_TTL } = require('../config/redis');
const { computeProfile, getProfile } = require('../controllers/profile.controller');

router.post('/profile/:handle/compute', apiWrite, authMiddleware, computeProfile);
router.get('/profile/:handle', apiGeneral, cacheMiddleware(req => `profile:${req.params.handle.trim().toUpperCase()}`, CACHE_TTL.PROFILE), getProfile);

module.exports = router;
