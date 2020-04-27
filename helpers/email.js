const { google } = require("googleapis");

const processEmails = ({ auth, messages }) => {
  try {
    // console.log("Messages", JSON.stringify(messages));
    const messagesList = messages.map((message) => {
      return getEmail({ auth, messageId: message.id });
    });
    return Promise.all(messagesList);
  } catch (error) {}
};

function readEmails({ auth, nextPageToken }) {
  const gmail = google.gmail({ version: "v1", auth });
  const reqObject = {
    userId: "me",
    maxResults: 500,
  };

  if (nextPageToken) {  
    reqObject.pageToken = nextPageToken;
  }

  return new Promise((resolve, reject) => {
    gmail.users.messages.list(reqObject, (err, res) => {
      if (err) reject(err);
      resolve(res.data);
    });
  });
}

const getEmail = ({ messageId, auth }) => {
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

const getUserProfie = ({ userId, auth }) => {
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

const deleteEmailById = (messageId) => {
  return new Promise((resolve, reject) => {
    gmail.users.messages.delete(
      {
        userId: "me",
        id: messageId,
      },
      (err, res) => {
        if (err) reject("Unable to delete email");
        console.log(res);
        resolve({ status: res });
      }
    );
  });
};

const deleteEmails = ({ ids, auth }) => {
  const gmail = google.gmail({ version: "v1", auth });

  return new Promise((resolve, reject) => {
    gmail.users.messages.batchDelete(
      {
        userId: "me",
        requestBody: { ids },
      },
      {
        headers: { "Content-Type": "application/json" },
      },
      (err, res) => {
        console.log(err);
        if (err) reject("Unable to delete");
        resolve(res);
      }
    );
  });
};

const moveEmailsToTrash = ({ id, auth }) => {
  const gmail = google.gmail({ version: "v1", auth });
  return new Promise((resolve, reject) => {
    gmail.users.messages.trash(
      {
        userId: "me",
        id,
      },
      (err, res) => {
        console.log(err);
        if (err) reject("Unable to trash");
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
  deleteEmailById,
  deleteEmails,
  moveEmailsToTrash,
};
