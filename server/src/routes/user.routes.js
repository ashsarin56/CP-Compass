const express = require('express');
const router = express.Router();
const { apiWrite, apiGeneral } = require('../middleware/rateLimiter');
const { register, getUser } = require('../controllers/user.controller');

router.post('/register', apiWrite, register);
router.get('/user/:handle', apiGeneral, getUser);

module.exports = router;
