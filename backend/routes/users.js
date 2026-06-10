const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const User = require("../models/User");
const upload = require("../middlewares/uploadCloudinary");
const cloudinary = require("../config/cloudinary");
const Conversation = require("../models/Conversation");
const Request = require("../models/Request");
const bcrypt = require("bcryptjs");
const { createNotification } = require("../services/notificationService");


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

//PUSHTOKEN
router.post("/push-token", auth, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token manquant" });
    }

    await User.findByIdAndUpdate(
      req.user.id,
      { expoPushToken: token },
      { new: true }
    );

    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Erreur push-token:", error);
    res.status(500).json({ message: "Erreur serveur" });
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

      // Skills
      if (req.body.skills) {
  try {
    const parsed = JSON.parse(req.body.skills);
    if (Array.isArray(parsed)) {
      user.skills = parsed;
    }
  } catch (e) {
    console.log("Erreur parsing skills:", e);
  }
}

      // equipements
      if (req.body.equipment) {
  try {
    const parsed = JSON.parse(req.body.equipment);
    if (Array.isArray(parsed)) {
      user.equipment = parsed;
    }
  } catch (e) {
    console.log("Erreur parsing equipments:", e);
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

// 🔹 Supprimer la photo de profil pro
router.delete("/profile/pro/profile-image", auth, async (req, res) => {
  try {
    if (req.user.role !== "pro") {
      return res.status(403).json({ error: "Accès réservé aux pros" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    if (!user.profileImage?.public_id) {
      return res.status(404).json({ error: "Aucune photo de profil" });
    }

    // supprimer de cloudinary
    await cloudinary.uploader.destroy(user.profileImage.public_id);

    // supprimer dans la base
    user.profileImage = null;

    await user.save();

    res.json({ message: "Photo supprimée" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Supprimer la photo de profil client
router.delete("/profile/client/profile-image", auth, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ error: "Accès réservé aux clients" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    if (!user.profileImage?.public_id) {
      return res.status(404).json({ error: "Aucune photo de profil" });
    }

    // 🔹 supprimer de cloudinary
    await cloudinary.uploader.destroy(user.profileImage.public_id);

    // 🔹 supprimer en base
    user.profileImage = null;

    await user.save();

    res.json({ message: "Photo supprimée" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

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

// 🔹 PUT /users/profile/client → mise à jour profil client
router.put(
  "/profile/client",
  auth,
  upload.single("profileImage"),
  async (req, res) => {
    try {

      const phoneRegex = /(\+?\d[\d\s.-]{7,})/;
const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

if (req.body.description) {
  if (
    phoneRegex.test(req.body.description) ||
    emailRegex.test(req.body.description)
  ) {
    return res.status(400).json({
      error: "Téléphone et email interdits dans la description"
    });
  }
}

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ error: "Utilisateur introuvable" });
      }

      if (req.user.role !== "client") {
        return res.status(403).json({ error: "Accès réservé aux clients" });
      }

      // 🔹 Champs texte
      user.name = req.body.name ?? user.name;
      user.phone = req.body.phone ?? user.phone;
      user.location = req.body.location ?? user.location;
      user.description = req.body.description ?? user.description;

      // 🔹 Image profil
      if (req.file) {

        if (user.profileImage?.public_id) {
          await cloudinary.uploader.destroy(user.profileImage.public_id);
        }

        user.profileImage = {
          url: req.file.path,
          public_id: req.file.filename,
        };
      }

      

      await user.save();

      res.json(user);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// 🔹 GET /users/:id → profil public d'un pro
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -notifications");

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    user.ratings.sort((a, b) => b.date - a.date);
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
router.post("/:id/review", auth, upload.array("photos", 5), async (req, res) => {
    try {
    const { score, comment, requestId } = req.body;

    // 🔹 Vérifier user cible (le pro noté)
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    // 🔹 Vérifier la demande
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Demande introuvable" });
    }

    const photos = req.files?.map(file => ({
  url: file.path, // ou cloudinary secure_url
  public_id: file.filename
})) || [];

let existingPhotos = [];

if (req.body.existingPhotos) {
  existingPhotos = JSON.parse(req.body.existingPhotos);
}

    // 🔴 NOUVELLE SÉCURITÉ : empêcher plusieurs avis pour UNE demande
    const existingReview = user.ratings.find(
  r =>
    r.fromUser.toString() === req.user.id &&
    r.request.toString() === requestId
);

  if (existingReview) {
  existingReview.score = score;
  existingReview.comment = comment;

  // 🔥 remplace complètement les photos
  existingReview.photos = [
    ...existingPhotos,
    ...photos
  ];
}

else {
  user.ratings.push({
    fromUser: req.user.id,
    request: requestId,
    score,
    comment,
    photos
  });
}


    user.updateAverageRating();
    await user.save();


    // 🔹 Mettre à jour la dernière interaction conversation
    const conversation = await Conversation.findOne({ request: requestId });

    if (conversation) {
      conversation.lastInteractionAt = new Date();
      conversation.lastInteractionBy = req.user.id;
      await conversation.save();
    }

    // 🔹 Sauvegarde de la request
    await request.save();

    let targetUserId;

if (req.user.role === "pro") {
  targetUserId = request.client; // client reçoit la notif
} else {
  targetUserId = user._id; // pro reçoit la notif
}

    await createNotification({
  userId: targetUserId, // 👉 celui qui reçoit la notif (le client ou le pro)
  type: "review",
    requestId: requestId
});

    res.json({
      message: "Avis enregistré",
      requestStatus: request.status
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/my-review", auth, async (req, res) => {
  const { requestId } = req.query;

  const user = await User.findById(req.params.id);

  const review = user.ratings.find(
    r =>
      r.fromUser.toString() === req.user.id &&
      r.request.toString() === requestId
  );

  res.json({ review: review || null });
});

// 🔹 PUT /users/change-password
router.put("/me/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Champs requis" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Mot de passe trop court" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Mot de passe actuel incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    res.json({ message: "Mot de passe modifié" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 PUT /users/change-email
router.put("/change-email", auth, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email requis" });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({ error: "Email déjà utilisé" });
    }

    const user = await User.findById(req.user.id);
    user.email = email;

    await user.save();

    res.json({ message: "Email modifié" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🔹 DELETE /users/delete-account
router.delete("/delete-account", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    // 🔹 supprimer image profil
    if (user.profileImage?.public_id) {
      await cloudinary.uploader.destroy(user.profileImage.public_id);
    }

    // 🔹 supprimer portfolio
    for (const img of user.portfolio || []) {
      if (img.public_id) {
        await cloudinary.uploader.destroy(img.public_id);
      }
    }

    await Request.deleteMany({
  client: user._id
});

    await user.deleteOne();

    res.json({ message: "Compte supprimé" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put("/onboarding-complete", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    user.onboardingCompleted = true;

    await user.save();

    res.json({
      message: "Onboarding terminé",
      onboardingCompleted: true,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;