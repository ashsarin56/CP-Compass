const passport=require('passport');
const GoogleStrategy=require('passport-google-oauth20').Strategy;
const User=require('../models/User');

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email=profile.emails[0].value;
      let user=await User.findOne({google_id:profile.id});
      if(user)return done(null,user);
      user=await User.findOne({email});
      if(user){
        user.google_id=profile.id;
        user.avatar_url=profile.photos?.[0]?.value||null;
        if(user.auth_provider==='local')user.auth_provider='google';
        await user.save();
        return done(null,user);
      }

      user=await User.create({
        google_id:profile.id,
        email,
        avatar_url:profile.photos?.[0]?.value||null,
        auth_provider:'google'
      });

      return done(null,user);
    } catch (err){
      return done(err,null);
    }
  }
));

module.exports = passport;
