const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const User = require("../models/User");
const upload = require("../middlewares/uploadCloudinary");
const cloudinary = require("../config/cloudinary");
const Conversation = require("../models/Conversation");

// 🔹 GET /users/me → profil connecté
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 PUT /users/profile/pro → mise à jour profil pro
router.put(
  "/profile/pro",
  auth,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "portfolio", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

      
      // Texte
      user.name = req.body.name ?? user.name;
      user.phone = req.body.phone ?? user.phone;
      user.siret = req.body.siret ?? user.siret;
      user.location = req.body.location ?? user.location;
      user.description = req.body.description ?? user.description;
      user.equipment = req.body.equipment ?? user.equipment;

      // Skills
      if (req.body.skills) {
        try {
          user.skills = JSON.parse(req.body.skills);
        } catch {
          user.skills = [];
        }
      }

      // Profile Image
      if (req.files?.profileImage?.[0]) {
        if (user.profileImage?.public_id) {
          await cloudinary.uploader.destroy(user.profileImage.public_id);
        }
        user.profileImage = {
          url: req.files.profileImage[0].path,
          public_id: req.files.profileImage[0].filename,
        };
      }

      if (!req.files?.profileImage?.[0]) {
  if (!user.profileImage?.url) {
    user.profileImage = {
      url: "https://res.cloudinary.com/dwjssp2pd/image/upload/v1773074497/default.jpg",
      public_id: ""
    };
  }
}

      // Portfolio
      if (req.files?.portfolio?.length) {
  const newImages = req.files.portfolio.map((file) => ({
    url: file.path,       // ou file.secure_url selon ta config Cloudinary
    public_id: file.filename || file.public_id,
  }));

  // Limiter le portfolio à 10 images
  user.portfolio = [...user.portfolio, ...newImages].slice(0, 10);
}

      await user.save();
      return res.status(200).json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// 🔹 Supprimer une image du portfolio
router.delete("/profile/pro/portfolio/:imageId", auth, async (req, res) => {
  try {
    if (req.user.role !== "pro") {
      return res.status(403).json({ error: "Accès réservé aux pros" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const image = user.portfolio.find(img => img._id.toString() === req.params.imageId);
if (!image) return res.status(404).json({ error: "Image introuvable" });

// Supprime de Cloudinary
await cloudinary.uploader.destroy(image.public_id);

// Supprime du tableau
user.portfolio = user.portfolio.filter(img => img._id.toString() !== req.params.imageId);

await user.save();

res.json({ message: "Image supprimée", portfolio: user.portfolio });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 GET /users/:id → profil public d'un pro
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -notifications");

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    let phone = null;
    let email = null;

    const { conversationId } = req.query;

    if (conversationId) {
      const conversation = await Conversation.findById(conversationId);

      if (conversation) {
        const dealAccepted =
          (conversation.dealProposedByPro && conversation.dealAcceptedByClient) ||
          (conversation.dealProposedByClient && conversation.dealAcceptedByPro);

        if (dealAccepted) {
          phone = user.phone;
          email = user.email;
        }
      }
    }

    res.json({
      ...user.toObject(),
      phone,
      email
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

//AVIS
router.post("/:id/review", auth, async (req, res) => {
  try {

    const { score, comment, requestId } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const alreadyRated = user.ratings.find(
      r =>
        r.fromUser.toString() === req.user.id &&
        r.request.toString() === requestId
    );

    if (alreadyRated) {
      return res.status(400).json({ error: "Avis déjà donné" });
    }

    user.ratings.push({
      fromUser: req.user.id,
      request: requestId,
      score,
      comment
    });

    user.updateAverageRating();

    await user.save();

    res.json(user);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;