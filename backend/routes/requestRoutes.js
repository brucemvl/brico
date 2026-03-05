const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Request = require("../models/Request");
const User = require("../models/User");
const { createNotification } = require("../services/notificationService");
const upload = require("../middlewares/uploadCloudinary");
const cloudinary = require("../config/cloudinary");
    const streamifier = require("streamifier");
    const sharp = require("sharp")
    const fetch = require("node-fetch");


// =======================
// 🔹 Récupérer toutes les demandes (test)
// =======================
router.get("/", auth, async (req, res) => {
  try {
    const requests = await Request.find();
    return res.json(requests);
  } catch (err) {
    console.error("Erreur GET /requests:", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /requests/client - récupère les demandes du client connecté
router.get("/client", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "client") {
      return res.status(403).json({ error: "Accès réservé aux clients" });
    }

    const requests = await Request.find({ client: req.user.id });
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// =======================
// 🔹 SUPPRIMER UNE DEMANDE
// =======================
router.delete("/:id", auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Demande introuvable" });

    // Seul le client qui a créé la demande peut la supprimer
    if (request.client.toString() !== req.user.id) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    await request.deleteOne(); // <-- c'est ici
    return res.json({ message: "Demande supprimée" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /requests/pro
router.get("/pro", auth, async (req, res) => {
  try {
    const requests = await Request.find({ status: "open" }); // toutes les demandes ouvertes
    const user = await User.findById(req.user.id);

    res.json({
      requests,
      skills: user.skills || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /requests/:id - détail d'une demande
router.get("/:id", auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate("client").populate("pro");
    console.log(request); // 🔹 Vérifie que request.images contient bien des URLs
    return res.json(request);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

// =======================
// 1️⃣ CRÉER UNE DEMANDE (CLIENT)
// =======================
router.post("/", auth, upload.array("images"), async (req, res) => {
  console.log("FILES:", req.files);
  console.log("BODY:", req.body);

  try {
    if (!req.user || req.user.role !== "client")
      return res.status(403).json({ error: "Seulement clients" });

    const newRequest = new Request({
      ...req.body,
      client: req.user.id,
    });


if (req.files && req.files.length > 0) {
  newRequest.images = [];

  for (const file of req.files) {
  // Télécharge le fichier depuis son URL temporaire (path)
  const response = await fetch(file.path);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Convertir en JPEG avec Sharp
  const jpegBuffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();

  // Upload Cloudinary
  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "requests", resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    streamifier.createReadStream(jpegBuffer).pipe(uploadStream);
  });

  newRequest.images.push({ url: uploadResult.secure_url, public_id: uploadResult.public_id });
}
}

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    console.error("Erreur POST /requests:", err.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =======================
// 2️⃣ PRO ENVOIE UNE OFFRE
// =======================
router.post("/:id/offer", auth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Utilisateur non authentifié" });
    if (req.user.role !== "pro") return res.status(403).json({ error: "Seulement pour les pros" });

    const { price, proposedDate, message } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request || request.status !== "open") return res.status(400).json({ error: "Demande invalide" });

    const alreadyOffered = request.offers?.find(o => o.pro.toString() === req.user.id);
    if (alreadyOffered) return res.status(400).json({ error: "Offre déjà envoyée" });

    request.offers.push({ pro: req.user.id, price, proposedDate, message });
    await request.save();

    await createNotification({
      userId: request.client,
      type: "new_offer",
      content: "Un professionnel a envoyé une offre",
      relatedRequest: request._id,
    });

    return res.json({ message: "Offre envoyée" });
  } catch (err) {
    console.error("Erreur POST /offer:", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// =======================
// 3️⃣ CLIENT ACCEPTE UNE OFFRE
// =======================
router.post("/:id/accept/:offerId", auth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Utilisateur non authentifié" });
    if (req.user.role !== "client") return res.status(403).json({ error: "Seulement pour les clients" });

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Demande introuvable" });

    const offer = request.offers.id(req.params.offerId);
    if (!offer) return res.status(404).json({ error: "Offre introuvable" });

    offer.accepted = true;
    request.pro = offer.pro;
    request.status = "accepted";
    await request.save();

    await createNotification({
      userId: offer.pro,
      type: "offer_accepted",
      content: "Votre offre a été acceptée 🎉",
      relatedRequest: request._id,
    });

    return res.json({ message: "Offre acceptée" });
  } catch (err) {
    console.error("Erreur POST /accept:", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// =======================
// 4️⃣ MESSAGERIE SÉCURISÉE
// =======================
router.post("/:id/message", auth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Utilisateur non authentifié" });

    const { content } = req.body;
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Demande introuvable" });

    const isAuthorized =
      request.client.toString() === req.user.id || request.pro?.toString() === req.user.id;
    if (!isAuthorized) return res.status(403).json({ error: "Non autorisé" });

    request.messages.push({ from: req.user.id, content });
    await request.save();

    const otherUser = request.client.toString() === req.user.id ? request.pro : request.client;
    if (otherUser) {
      await createNotification({
        userId: otherUser,
        type: "new_message",
        content: "Nouveau message reçu",
        relatedRequest: request._id,
      });
    }

    return res.json({ message: "Message envoyé", messages: request.messages });
  } catch (err) {
    console.error("Erreur POST /message:", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;