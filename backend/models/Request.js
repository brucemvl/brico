const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const offerSchema = new mongoose.Schema({
  pro: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  price: { type: Number, required: true },
  proposedDate: Date,
  message: String,
  accepted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const requestSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pro: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  title: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: ["peinture", "plomberie", "agencement", "électricité", "divers"],
    required: true
  },
  location: { type: String, required: true },
  budget: Number,

  status: {
    type: String,
    enum: ["open", "accepted", "in_progress", "completed", "cancelled"],
    default: "open"
  },

  offers: [offerSchema],
  messages: [messageSchema],

  clientValidated: { type: Boolean, default: false },
  proValidated: { type: Boolean, default: false },
  ratingGiven: { type: Boolean, default: false },

  scheduledDate: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

requestSchema.pre("save", async function (next) {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model("Request", requestSchema);