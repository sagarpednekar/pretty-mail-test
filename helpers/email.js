const { google } = require("googleapis");
const { setKey, getKey } = require("../helper");

const processEmails = (messages) => {
  try {
    // console.log("Messages", JSON.stringify(messages));
    const messagesList = messages.map((message) => {
      return getEmail(message.id, getKey("oAuthClient"));
    });
    return Promise.all(messagesList);
  } catch (error) {}
};

function readEmails(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  //   console.log("Next Page Token", pageToken);
  const reqObject = {
    userId: "me",
    maxResults: 50,
  };

  if (getKey("nextPageToken")) {
    reqObject.pageToken = getKey("nextPageToken");
  }

  return new Promise((resolve, reject) => {
    gmail.users.messages.list(reqObject, (err, res) => {
      if (err) console.log(err);
      // console.log("--->", res.data);
      //   if (res && res.data && res.data.nextPageToken) {
      //     setKey("pageToken", res.data.nextPageToken);
      //     pageToken = res.data.nextPageToken;
      //   }

      //   const messages =
      //     res && res.data && res.data.messages ? res.data.messages : [];

      resolve(res);
      // if (messages.length > 0) {
      //   const response = new Promise((resolve, reject) => {
      //     resolve(
      //       messages.map((message, index) => readEmail(message.id, index, auth))
      //     );
      //   }).then(async (array) => {
      //     console.log("Count", array.length);
      //     Promise.all(array)
      //       .then((item) => {
      //         // console.log("Item", item);
      //         // emails.push(item);
      //         emails = [...emails, ...item];

      //         console.log("====================================");
      //         console.log(emails.length);
      //         console.log("====================================");
      //       })
      //       .catch((err) => {
      //         console.log(err);
      //       });
      //   });
      // }
    });
  });
}

const getEmail = (messageId, auth) => {
  const gmail = google.gmail({ version: "v1", auth });

  return new Promise((resolve, reject) => {
    gmail.users.messages.get(
      {
        userId: "me",
        id: messageId,
      },
      (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res.data);
      }
    );
  });
};

const getUserProfie = (userId, auth) => {
  const gmail = google.gmail({ version: "v1", auth });
  return new Promise((resolve, reject) => {
    gmail.users.getProfile(
      {
        userId,
      },
      (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res.data);
      }
    );
  });
};

module.exports = {
  getEmail,
  processEmails,
  readEmails,
  getUserProfie,
};
