const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["message", "deal", "review", "request", "offer_accepted"],
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  data: {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      default: null,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
  },
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);