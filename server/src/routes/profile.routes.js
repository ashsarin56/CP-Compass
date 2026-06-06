const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { computeProfile, getProfile } = require('../controllers/profile.controller');

router.post('/profile/:handle/compute', authMiddleware, computeProfile);
router.get('/profile/:handle', getProfile);

module.exports = router;
