const express = require("express");

const app = express();

require("dotenv").config();

const PORT = process.env.PORT;

app.get("/", (req, res) => {
  res.send({
    status: "This is backent Service",
  });
});

app.listen(PORT, () => console.log(`Server is running on ${PORT}`));
