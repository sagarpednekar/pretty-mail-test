const Queue = require("bull");
const { readEmails, getEmail } = require("./helpers/email");
const syncEmailsQ = new Queue("sync-emails", "redis://127.0.0.1:6379");
const { setKey, getKey } = require("./helper");
const UserModel = require("./models/user");

// define queue
const processEmails = (messages) => {
  try {
    // console.log("Messages", JSON.stringify(messages));
    const messagesList = messages.map((message) => {
      return getEmail(message.id, getKey("oAuthClient"));
    });
    return Promise.all(messagesList);
  } catch (error) {}
};

const initialize = () => {
  syncEmailsQ.add({
    auth: getKey("oAuthClient"),
  });
};

syncEmailsQ.process(async (job) => {
  try {
    console.log(JSON.stringify(job.data));
    const response = await readEmails(getKey("oAuthClient"));
    console.log("param", JSON.stringify(response.data.nextPageToken));

    if (response && response.data && response.data.nextPageToken) {
      setKey("nextPageToken", response.data.nextPageToken);
    }

    const callMessages = await processEmails(response.data.messages);


    // console.log("response", JSON.stringify(callMessages));
    const profile = getKey("profile");

    const user = await UserModel.findOneAndUpdate(
      { email: profile.email },
      { $push: { messages: callMessages } }
    );

    syncEmailsQ.add({
      auth: getKey("oAuthClient"),
    });
  } catch (error) {
    console.error(error);
  }
});

module.exports = {
  initialize,
};
