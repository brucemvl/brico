const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ==========================
// REGISTER
// ==========================
router.post('/register', async (req, res) => {
  try {
    let { name, email, password, role } = req.body;

    // ==========================
    // 🔎 Validation des champs
    // ==========================
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mot de passe trop court (min 6 caractères)" });
    }

    // Normaliser email
    email = email.toLowerCase().trim();

    // ==========================
    // 🔐 Validation du rôle
    // ==========================
    const allowedRoles = ["client", "pro"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }

    // ==========================
    // 👤 Vérifier si user existe
    // ==========================
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email déjà utilisé" });
    }

    // ==========================
    // 🔒 Hash password
    // ==========================
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ==========================
    // 💾 Création user
    // ==========================
    const user = await User.create({
      name: name.trim(),
      email,
      password: hashedPassword,
      role,
    });

    // ==========================
    // 🎟 Génération JWT
    // ==========================
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    // ==========================
    // ✅ Réponse propre
    // ==========================
    res.status(201).json({
      message: "Utilisateur créé avec succès",
      token,
      role: user.role,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ==========================
// LOGIN
// ==========================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Utilisateur non trouvé' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe incorrect' });
    }

    // 🔐 Génération du JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    res.json({
      message: "Connexion réussie",
      token,
      role: user.role,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;