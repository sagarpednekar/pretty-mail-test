const mongoose = require("mongoose");



// message.index({ id: 1 }, { unique: true });

const userSchema = mongoose.Schema({
  name: {
    type: String,
    index: true,
  },
  email: String,
  profileId: String,
  messageCount: Number,
  transformedMessages: Array,
});

userSchema.index({ email: 1 }, { unique: true });
// message.index({ id: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
