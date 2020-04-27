const express = require("express");

const app = express();

const passport = require("passport");

const bodyParser = require("body-parser");

const atob = require("atob");

const mongoose = require("mongoose");

require("dotenv").config();

const { google } = require("googleapis");

const { client_id, client_secret, redirect_uri } = require("./config").web;
const PORT = process.env.PORT;

const {
  readEmails,
  getEmail,
  processEmails,
  getUserProfie,
  deleteEmails,
  moveEmailsToTrash,
} = require("./helpers/email");

const { connect, db } = require("./dbhelper");

const UserModel = require("./models/user");
const MessageModel = require("./models/message");

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uri
);

const authenticate = (req, res, next) => {
  if (!req.body.passcode) {
    return res.status(401).send({ msg: "Try login again" });
  }
  const token = atob(req.body.passcode);
  const auth = JSON.parse(token);
  oauth2Client.setCredentials(auth);
  next();
};

const auth = require("./auth");

connect();

auth(passport);
app.use(passport.initialize());
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
  );
  res.header("Access-Control-Allow-Methods", "*");
  next();
});

app.get("/", (req, res) => {
  res.json({
    status: "This is backend Service",
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
      oauth2Client.setCredentials({
        access_token: req.user.token,
        refresh_token: req.user.refreshToken,
      });

      const result = await getUserProfie({
        userId: req.user.profile.id,
        auth: oauth2Client,
      });

      const userData = await UserModel.findOneAndUpdate(
        { email: result.emailAddress },
        { messageCount: result.messagesTotal }
      );
      if (!userData) {
        const user = await UserModel.create({
          email: result.emailAddress,
          name: req.user.profile.displayName,
          profileId: req.user.profile.id,
          messageCount: result.messagesTotal,
        });
      }

      // redirect to front end url
      res.redirect(
        `http://localhost:3001?access_token=${req.user.token}&refresh_token=${req.user.refreshToken}&profileId=${req.user.profile.id}`
      );
    } catch (error) {
      console.log("Error", error);
    }
  }
);

app.post("/sync-mails", authenticate, async (req, res) => {
  try {
    const user = req.body.user;

    // find current logged in user'

    const userData = await UserModel.findOne({ email: user.email }).lean();

    const response = await readEmails({
      auth: oauth2Client,
      nextPageToken: req.body.nextPageToken,
    });

    let callMessages = await processEmails({
      auth: oauth2Client,
      messages: response.messages,
    });

    callMessages = callMessages.map((message) => {
      return { ...message, userId: userData._id };
    });

    let insertedMessages = await MessageModel.insertMany(callMessages);

    const syncedMessages = await MessageModel.find({
      userId: userData._id,
    }).count();

    res.status(200).send({
      msg: "Updated ",
      nextPageToken:
        response && response.nextPageToken ? response.nextPageToken : null,
      syncedMessages: syncedMessages ? syncedMessages : 0,
      error: false,
    });
  } catch (error) {
    res.status(500).send({
      msg: error.message,
      error: true,
    });
  }
});

app.post("/user/:id", authenticate, async (req, res) => {
  const profileId = req.params.id;
  if (!profileId) {
    return res.status(404).send({
      error: true,
      data: [],
      msg: "Not found",
    });
  }
  const { _id, ...user } = await UserModel.findOne(
    { profileId },
    { messages: 0, __v: 0 }
  ).lean();

  return res.status(200).send({
    error: false,
    data: { ...user, userId: _id },
  });
});

app.post("/user/:id/messages", authenticate, async (req, res) => {
  const profileId = req.params.id;
  if (!profileId) {
    return res.status(404).send({
      error: true,
      data: [],
      msg: "Not found",
    });
  }
  const messages = await UserModel.findOne({ profileId }, { messages: 1 });
  return res.status(200).send({
    error: false,
    data: messages,
  });
});

app.post("/user/:id/transform", async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      throw new Error("Invalid userId: ", userId);
    }

    const result = await MessageModel.aggregate([
      {
        $match: { userId },
      },
      {
        $unwind: "$payload.headers",
      },
      {
        $match: { "payload.headers.name": "From" },
      },
      {
        $project: {
          messageId: "$id",
          snippet: 1,
          label: {
            $arrayElemAt: [{ $split: ["$payload.headers.value", "<"] }, 0],
          },
        },
      },
      {
        $group: {
          _id: "$label",
          messages: { $push: "$$ROOT" },
          total: { $sum: 1 },
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    const updateLabels = await UserModel.findOneAndUpdate(
      { _id: userId },
      { $set: { transformedMessages: result } },
      {
        new: true,
      }
    ).lean();

    console.log("result", updateLabels);

    return res.status(200).send({
      error: false,
      data: updateLabels,
    });
  } catch (error) {
    return res.status(500).send({
      error: true,
      data: [],
      msg: error.stack,
    });
  }
});

app.get("/user/:id/messages", async (req, res) => {
  const limit = Number(
    req.query.limit && req.query.limit > 0 ? req.query.limit : 10
  );
  const pageNo = Number(
    req.query.pageNo && req.query.pageNo > 1 ? req.query.pageNo : 1
  );
  const sort =
    req.query.sort && req.query.sort.toLocaleLowerCase() === "asc" ? 1 : -1;

  try {
    const userId = req.params.id;
    const results = await UserModel.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          transformedMessages: 1,
          _id: 0,
          totalMessages: { $size: "$transformedMessages" },
        },
      },
      { $unwind: "$transformedMessages" },
      { $skip: limit * (pageNo - 1) },
      { $limit: limit },
      {
        $project: {
          label: "$transformedMessages._id",
          messages: "$transformedMessages.messages",
          totalCount: { $size: "$transformedMessages.messages" },
          totalMessages: "$totalMessages",
        },
      },
      { $sort: { totalCount: sort } },
    ]);

    if (!results) {
      throw new Error("Not found");
    }

    return res.status(200).send({
      error: false,
      results,
    });
  } catch (error) {
    return res.status(404).send({
      error: true,
      result: [],
      msg: error.stack,
    });
  }
});

app.post("/messages/delete", authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    // delete from gmail apis
    const deletedEmails = await deleteEmails({ auth: oauth2Client, ids });

    console.log("Deleted from gmail apis", deleteEmails);

    // delete  from db
    if (!deletedEmails) {
      throw new Error("Error while deleting records from api");
    }
    const result = await MessageModel.deleteMany({
      id: {
        $in: ids,
      },
    });

    console.log("Deleted from db", result);

    if (!result) {
      res.status(404).send({
        error: true,
        data: [],
        msg: "Error while deleting record",
      });
    }
    return res.status(200).send({
      error: false,
      data: [],
    });
  } catch (error) {
    res.status(404).send({
      error: true,
      data: [],
      msg: error.stack,
    });
  }
});

app.post("/message/trash", async (req, res) => {
  try {
    const { ids } = req.body;
    const trashed = ids.map((messageId) =>
      moveEmailsToTrash({ auth: oauth2Client, id: messageId })
    );
    const result = await Promise.all(trashed);
    const deletedFromDB = await MessageModel.deleteMany({
      id: {
        $in: ids,
      },
    });

    console.log(result);
    if (!result) {
      throw new Error("Unable to delete");
    }
    return res.status(200).send({
      error: false,
      data: result,
    });
  } catch (error) {
    res.status(404).send({
      error: true,
      data: [],
      msg: error.stack,
    });
  }
});

app.listen(PORT, () => console.log(`Server is running on ${PORT}`));
