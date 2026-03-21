const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // liste des IDs qui ont lu
});

const offerSchema = new mongoose.Schema({
  pro: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  price: { type: Number, required: true },
  proposedDate: Date,
  message: String,
  accepted: { type: Boolean, default: false }, // marque si cette offre a été acceptée
  createdAt: { type: Date, default: Date.now }
});

const requestSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // 🔹 PRO choisi et offre acceptée
  proAssigned: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  acceptedOffer: offerSchema, // copie de l'offre acceptée

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

  // 🔹 Statut global de la demande
  status: {
  type: String,
  enum: ["open","in_progress","completed"],
  default: "open"
},

reviewByClient: { type: Boolean, default: false },
reviewByPro: { type: Boolean, default: false },

  offers: [offerSchema],
  messages: [messageSchema],

  // 🔹 Validation du deal par les deux parties
  clientValidated: { type: Boolean, default: false },
  proValidated: { type: Boolean, default: false },

  // 🔹 Suivi des notes et planification
  ratingGiven: { type: Boolean, default: false },
  scheduledDate: Date,

  }, {
  timestamps: true
});



module.exports = mongoose.models.Request || mongoose.model("Request", requestSchema);