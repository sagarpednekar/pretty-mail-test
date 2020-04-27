const mongoose = require("mongoose");

// const url =
//   "mongodb+srv://email-service:YztWspQMgm43M3uO@cluster0-leh7h.mongodb.net/test?retryWrites=true&w=majority";


const url =  "mongodb://localhost/email-db";

const connect = () => {
  mongoose
    .connect(url, {
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
  db: mongoose.connection,
};
