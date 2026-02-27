const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  score: { type: Number, min: 1, max: 5, required: true },
  comment: String,
  date: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  type: { type: String }, // new_request, new_offer, message, validation
  content: String,
  relatedRequest: { type: mongoose.Schema.Types.ObjectId, ref: "Request" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  // Infos générales
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,

  role: { type: String, enum: ["client", "pro"], required: true },

  // Infos pro
  siret: String,
  insured: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },

  // 🔥 IMPORTANT pour matching compétences
  skills: [{ type: String }],

  subscriptionActive: { type: Boolean, default: false },
  subscriptionStart: Date,
  subscriptionEnd: Date,

  ratings: [ratingSchema],
  averageRating: { type: Number, default: 0 },

  completedRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "Request" }],

  // 🔔 Notifications
  notifications: [notificationSchema],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.methods.updateAverageRating = function () {
  if (!this.ratings.length) {
    this.averageRating = 0;
    return;
  }
  const sum = this.ratings.reduce((acc, r) => acc + r.score, 0);
  this.averageRating = sum / this.ratings.length;
};

userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", userSchema);