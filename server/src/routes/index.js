const express = require('express');
const router = express.Router();

router.use('/', require('./user.routes'));
router.use('/', require('./profile.routes'));
router.use('/', require('./recommendation.routes'));
router.use('/', require('./radar.routes'));
router.use('/', require('./sync.routes'));

module.exports = router;