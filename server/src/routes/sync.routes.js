const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { triggerSync } = require('../controllers/sync.controller');
router.post('/sync/:handle', authMiddleware, triggerSync);
module.exports = router;
