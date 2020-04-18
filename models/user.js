const mongoose = require("mongoose");

const payload = mongoose.Schema({
  partId: String,
  mimeType: String,
  filename: String,
  headers: [
    {
      name: String,
      value: String,
    },
  ],
  body: {
    attachmentId: String,
    size: Number,
    data: Number,
  },
  parts: Array,
});

const message = mongoose.Schema({
  id: {
    type: String,
  },
  threadId: String,
  labelIds: [String],
  snippet: String,
  historyId: Number,
  internalDate: Number,
  sizeEstimate: Number,
  raw: String,
});

message.index({ id: 1 }, { unique: true });

const userSchema = mongoose.Schema({
  name: {
    type: String,
    index: true,
  },
  email: String,
  messages: [message],
});

userSchema.index({ email: 1 }, { unique: true });
message.index({ id: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
