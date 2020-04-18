const express = require("express");

const app = express();

const passport = require("passport");

require("dotenv").config();

const { google } = require("googleapis");

const redis = require("redis");

const redisConfig = require("./config").web.redis;
console.log("Redis config", redisConfig);
const client = redis.createClient({ ...redisConfig });

client.on("error", function (error) {
  console.error("Redis error -->", error);
});

client.on("connect", (err, res) => {
  console.log("Redis Instance connected");
});

const { client_id, client_secret, redirect_uri } = require("./config").web;
const PORT = process.env.PORT;

const {
  readEmails,
  getEmail,
  processEmails,
  getUserProfie,
} = require("./helpers/email");

const { initialize } = require("./jobScheduler");

const { connect, db } = require("./dbhelper");

const UserModel = require("./models/user");

const authenticate = (req, res, next) => {
  if (!getKey("oAuthClient")) {
    res.redirect("/auth/google");
  }
  next();
};

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uri
);
const auth = require("./auth");

const { setKey, getKey } = require("./helper");

connect();

auth(passport);
app.use(passport.initialize());
app.get("/", (req, res) => {
  res.json({
    status: "This is backent Service",
  });
});
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: [
      "https://mail.google.com",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    accessType: "offline",
    approvalPrompt: "force",
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",
  }),
  async (req, res) => {
    try {
      // console.log(JSON.stringify(req.user));

      // save token in cache

      setKey("access_token", req.user.token);
      setKey("refresh_token", req.user.refresh_token);

      oauth2Client.setCredentials({
        access_token: getKey("access_token"),
        refresh_token: getKey("refresh_token"),
      });

      setKey("oAuthClient", oauth2Client);

      const result = await getUserProfie(req.user.profile.id, oauth2Client);

      setKey("profile", {
        ...req.user.profile,
        email: result && result.emailAddress,
      });

      // const userData = await UserModel.find({ email: result.emailAddress });

      const user = await UserModel.create({
        email: result.emailAddress,
        name: req.user.profile.displayName,
      });

      // redirect to front end url
      res.redirect("/startSync");
    } catch (error) {
      console.log("Error", error);
    }
  }
);

app.get("/emails", authenticate, async (req, res) => {
  const response = await readEmails(getKey("oAuthClient"));
  const callMessages = await processEmails(response.data.messages);

  res.send({
    response,
    length:
      (response.data &&
        response.data.messages &&
        response.data.messages.length) ||
      0,
  });
});

app.get("/messages", async (req, res) => {
  const results = await UserModel.find({});

  res.send({
    results,
  });
  // client.lrange(getKey("profile_id"), 0, -1, (err, result) => {
  //   if (err) {
  //     return res.send({
  //       result: [],
  //       error: true,
  //     });
  //   }
  // });
});

app.get("/startSync", authenticate, (req, res) => {
  initialize();
  res.send({
    msg: "Started",
  });
});

app.listen(PORT, () => console.log(`Server is running on ${PORT}`));
