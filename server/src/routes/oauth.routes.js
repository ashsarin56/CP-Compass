const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authMiddleware = require('../middleware/auth');
const { googleCallback, linkHandle } = require('../controllers/oauth.controller');

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_BASE_URL}/?error=oauth_failed`
  }),
  googleCallback
);

router.post('/link-handle', authMiddleware, linkHandle);

module.exports = router;
