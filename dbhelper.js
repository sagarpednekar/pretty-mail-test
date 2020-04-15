const mongoose = require("mongoose");

const connect = () => {
  mongoose
    .connect("mongodb://localhost:27017/pretty-mail", {
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
};
