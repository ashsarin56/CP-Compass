const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { signup, login, me } = require('../controllers/auth.controller');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authMiddleware, me);

module.exports = router;
