const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },

  readBy: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: "User"
}],

  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({

  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Request",
    required: true
  },

  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  pro: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  dealProposedByClient: { type: Boolean, default: false },
dealProposedByPro: { type: Boolean, default: false },
  dealAcceptedByClient: { type: Boolean, default: false },
dealAcceptedByPro: { type: Boolean, default: false },

  messages: [messageSchema],

  lastInteractionAt: {
  type: Date,
  default: Date.now
},

lastInteractionBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User"
}

}, { timestamps: true });

module.exports = mongoose.model("Conversation", conversationSchema);