const mongoose = require("mongoose");

const connect = () => {
  mongoose
    .connect("mongodb+srv://email-service:YztWspQMgm43M3uO@cluster0-leh7h.mongodb.net/test?retryWrites=true&w=majority", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("MongoDB Up and runnig ..");
    })
    .catch((error) => {
      console.error(error);
    });
};

module.exports = {
  connect,
  db: mongoose.connection
};
