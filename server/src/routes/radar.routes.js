const express = require('express');
const router = express.Router();
const { apiGeneral } = require('../middleware/rateLimiter');
const { getRadar } = require('../controllers/radar.controller');

router.get('/radar/:handle', apiGeneral, getRadar);

module.exports = router;
