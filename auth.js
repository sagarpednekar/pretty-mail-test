// oauth integration
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

const { client_id, client_secret, redirect_uri } = require("./config").web;

module.exports = (passport) => {
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
  passport.use(
    new GoogleStrategy(
      {
        clientID: client_id,
        clientSecret: client_secret,
        callbackURL: redirect_uri,
      },
      (token, refreshToken, profile, done) => {
        console.log(
          "token",
          token,
          "refresh",
          refreshToken,
          "profile",
          profile
        );
        return done(null, {
          profile,
          token,
          refreshToken,
        });
      }
    )
  );
};
