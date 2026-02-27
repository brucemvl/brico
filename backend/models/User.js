const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  score: { type: Number, min: 1, max: 5, required: true },
  comment: String,
  date: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["new_request", "new_offer", "message", "validation"]
  },
  content: String,
  relatedRequest: { type: mongoose.Schema.Types.ObjectId, ref: "Request" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({

  // Infos générales
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: String,

  role: { type: String, enum: ["client", "pro"], required: true },

  // 🔹 Infos PRO
  siret: {
    type: String,
    validate: {
      validator: function (value) {
        if (!value) return true;
        return /^\d{14}$/.test(value);
      },
      message: "Le SIRET doit contenir 14 chiffres"
    }
  },
  location: { type: String, trim: true },
description: { type: String, trim: true },
equipment: { type: String, trim: true },

  // 🔥 Badge automatique
  proBadge: {
    type: Boolean,
    default: false
  },

  insured: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },

  skills: [{ type: String, trim: true }],

  subscriptionActive: { type: Boolean, default: false },
  subscriptionStart: Date,
  subscriptionEnd: Date,

  ratings: [ratingSchema],
  averageRating: { type: Number, default: 0 },

  completedRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "Request" }],

  notifications: [notificationSchema]

}, { timestamps: true });


//
// ⭐ Auto activation du badge si SIRET présent
//
userSchema.pre("save", async function () {
  if (this.role === "pro" && this.siret) {
    this.proBadge = true;
  } else {
    this.proBadge = false;
  }
});


//
// ⭐ Recalcul moyenne
//
userSchema.methods.updateAverageRating = function () {
  if (!this.ratings.length) {
    this.averageRating = 0;
    return;
  }
  const sum = this.ratings.reduce((acc, r) => acc + r.score, 0);
  this.averageRating = sum / this.ratings.length;
};

module.exports = mongoose.model("User", userSchema);