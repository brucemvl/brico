const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  request: { type: mongoose.Schema.Types.ObjectId, ref: "Request", required: true },
  score: { type: Number, min: 1, max: 5, required: true },
  comment: String,
  date: { type: Date, default: Date.now },

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
equipment: [{ type: String, trim: true }],

  // 🔥 Badge automatique
  proBadge: {
    type: Boolean,
    default: false
  },

  insured: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },

  skills: [{ type: String, trim: true }],

stripeCustomerId: String,
stripeSubscriptionId: String,
subscriptionStatus: {
  type: String,
  enum: ["active", "inactive", "cancelled", "past_due"],
  default: "inactive"
},
  subscriptionStart: Date,
  subscriptionEnd: Date,

  expoPushToken: {
  type: String
},

onboardingCompleted: {
  type: Boolean,
  default: false
},

notificationPreferences: {
  message: { type: Boolean, default: true },
  deal: { type: Boolean, default: true },
  request: { type: Boolean, default: true },
  review: { type: Boolean, default: true },
},

  ratings: [ratingSchema],
  averageRating: { type: Number, default: 0 },

  completedRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "Request" }],

  profileImage: {
  url: {
    type: String
  },
  public_id: String
},

portfolio: [
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    url: String,
    public_id: String
  }
],


}, { timestamps: true });


//
// ⭐ Auto activation du badge si SIRET présent
//
userSchema.pre("save", async function () {

  // ⭐ Activation badge pro
  if (this.role === "pro" && this.siret) {
    this.proBadge = true;
  } else {
    this.proBadge = false;
  }

  // ⭐ Image par défaut selon rôle
  if (!this.profileImage?.url) {

    if (this.role === "pro") {
      this.profileImage = {
        url: "https://res.cloudinary.com/dwjssp2pd/image/upload/v1773074497/default_pro.jpg",
        public_id: ""
      };
    }

    if (this.role === "client") {
      this.profileImage = {
        url: "https://res.cloudinary.com/dwjssp2pd/image/upload/v1775330960/default_client.png",
        public_id: ""
      };
    }

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

module.exports = mongoose.models.User || mongoose.model("User", userSchema);