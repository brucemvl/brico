const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const offerSchema = new mongoose.Schema({
  pro: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  price: { type: Number, required: true },
  proposedDate: Date,
  message: String,
  accepted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const assignedProSchema = new mongoose.Schema({
  pro: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  status: {
    type: String,
    enum: ["active", "cancelled", "completed"],
    default: "active",
  },

  acceptedOffer: offerSchema,

  agreedAt: { type: Date, default: Date.now },
  cancelledAt: Date,
  completedAt: Date,

  reviewByClient: { type: Boolean, default: false },
  reviewByPro: { type: Boolean, default: false },
});

const requestSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  assignedPros: [assignedProSchema],

  title: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: ["Peinture", "Plomberie", "Agencement", "Electricité", "Carrelage", "Divers"],
    required: true
  },
  location: { type: String, required: true },
  budget: Number,
  images: [{ url: String, public_id: String }],

  status: {
    type: String,
    enum: ["open", "in_progress", "completed"],
    default: "open"
  },

  offers: [offerSchema],
  messages: [messageSchema],

  clientValidated: { type: Boolean, default: false },
  proValidated: { type: Boolean, default: false },

  ratingGiven: { type: Boolean, default: false },
  scheduledDate: Date,

  completedByPro: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  completedAt: Date,
}, {
  timestamps: true
});

module.exports = mongoose.models.Request || mongoose.model("Request", requestSchema);