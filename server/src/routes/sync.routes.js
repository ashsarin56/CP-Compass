const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { apiWrite } = require('../middleware/rateLimiter');
const { triggerSync } = require('../controllers/sync.controller');

router.post('/sync/:handle', apiWrite, authMiddleware, triggerSync);

module.exports = router;
