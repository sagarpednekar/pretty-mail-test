const express = require("express");

const app = express();

const passport = require("passport");

const redis = require("redis");

const client = redis.createClient();

client.on("error", function (error) {
  console.error("Redis error -->", error);
});

client.on("connect", (err, res) => {
  console.log("Connected Successfully");
});

const { google } = require("googleapis");

const PORT = 3000;

const { client_id, client_secret, redirect_uris } = require("./config").web;

const {
  readEmails,
  getEmail,
  processEmails,
  getUserProfie,
} = require("./helpers/email");

const { initialize } = require("./jobScheduler");

const { connect } = require("./dbhelper");

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
  redirect_uris[0]
);
const auth = require("./auth");

const { setKey, getKey } = require("./helper");

connect();

auth(passport);
app.use(passport.initialize());
app.get("/", (req, res) => {
  res.json({
    status: "session cookie not set",
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
  
      setKey("profile", { ...req.user.profile, email: result && result.emailAddress });
  
      const user = await UserModel.create({
        email: result.emailAddress,
        name: req.user.profile.displayName,
      });
  
      // redirect to front end url
      res.redirect("/startSync");
      
    } catch (error) {
      console.log("Error",error)
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

app.get("/messages", (req, res) => {
  client.lrange(getKey("profile_id"), 0, -1, (err, result) => {
    if (err) {
      return res.send({
        result: [],
        error: true,
      });
    }
    res.send({
      result: JSON.parse(JSON.stringify(result)),
      //   length: JSON.parse(result).length,
    });
  });
});

app.get("/message/:id", authenticate, async (req, res) => {
  try {
    if (!req.params.id) {
      throw new Error("Message not found with this id " + req.params.id);
    }
    const messageId = req.params.id;
    const response = await getEmail(messageId, getKey("oAuthClient"));
    res.send({
      response,
    });
  } catch (error) {
    console.log(error.stack);
    res.status(404).send({
      message: "Not found",
    });
  }
});

app.get("/startSync", authenticate, (req, res) => {
  initialize();
  res.send({
    msg: "Started",
  });
});

app.listen(PORT, () => console.log(`Server is running on ${PORT}`));
