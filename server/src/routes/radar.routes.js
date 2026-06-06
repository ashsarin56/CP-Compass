const express = require('express');
const router = express.Router();
const { getRadar } = require('../controllers/radar.controller');

router.get('/radar/:handle', getRadar);

module.exports = router;
