const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const User = require("../models/User");

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
router.put("/profile/pro", auth, async (req, res) => {
  try {
    if (req.user.role !== "pro") {
      return res.status(403).json({ error: "Accès réservé aux pros" });
    }

    const { phone, skills, siret, location, description, equipment } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    user.phone = phone ?? user.phone;
    user.skills = skills ?? user.skills;
    user.siret = siret ?? user.siret;
    user.location = location ?? user.location;
    user.description = description ?? user.description;
    user.equipment = equipment ?? user.equipment;

    await user.save();

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;