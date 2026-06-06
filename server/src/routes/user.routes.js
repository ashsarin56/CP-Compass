const express = require('express');
const router = express.Router();
const { register, getUser } = require('../controllers/user.controller');
router.post('/register', register);
router.get('/user/:handle', getUser);
module.exports = router;
