const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Request = require("../models/Request");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const { createNotification } = require("../services/notificationService");
const upload = require("../middlewares/uploadCloudinary");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const sharp = require("sharp");
const fetch = require("node-fetch");

// =======================
// 🔹 GET toutes les demandes (test/debug)
// =======================
router.get("/", auth, async (req, res) => {
  try {
    const requests = await Request.find();
    res.json(requests);
  } catch (err) {
    console.error("GET /requests error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =======================
// 🔹 GET demandes du client connecté
// =======================
router.get("/client", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "client") {
      return res.status(403).json({ error: "Accès réservé aux clients" });
    }

    const requests = await Request.find({ client: req.user.id })
      .populate("client", "name profileImage")
      .populate("pro", "name profileImage");

    const conversations = await Conversation.find({ client: req.user.id });

    const formatted = requests.map(reqItem => {
      const conv = conversations.find(c => c.request.toString() === reqItem._id.toString());
      const hasUnread = conv?.messages?.some(msg => !msg.readBy.includes(req.user.id)) || false;
      return { ...reqItem.toObject(), hasUnread };
    });

    res.json(formatted);
  } catch (err) {
    console.error("GET /requests/client error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =======================
// 🔹 GET demandes ouvertes pour les pros
// =======================
router.get("/pro", auth, async (req, res) => {
  try {
    const requests = await Request.find({ status: "open" });
    const user = await User.findById(req.user.id);

    res.json({
      requests,
      skills: user.skills || [],
    });
  } catch (err) {
    console.error("GET /requests/pro error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// 🔹 GET détail d’une demande + messages
// =======================
router.get("/:id", auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("client", "name profileImage")
      .populate("pro", "name profileImage");

    if (!request) return res.status(404).json({ error: "Demande introuvable" });

let conversation = await Conversation.findOne({
  request: req.params.id,
  $or: [
    { pro: req.user.id },
    { client: req.user.id }
  ]
}).populate("messages.from", "name profileImage");

const conversations = await Conversation.find({
  request: req.params.id,
})
.populate("pro", "name profileImage")
.populate("messages.from", "name profileImage")
.sort({ updatedAt: -1 });
      

    res.json({
  ...request.toObject(),
  conversations
});
  } catch (err) {
    console.error("GET /requests/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// 🔹 POST création d’une demande (client)
// =======================
router.post("/", auth, upload.array("images"), async (req, res) => {
  try {
    if (!req.user || req.user.role !== "client") {
      return res.status(403).json({ error: "Seulement clients" });
    }

    const newRequest = new Request({
      ...req.body,
      client: req.user.id,
    });

    if (req.files && req.files.length > 0) {
      newRequest.images = [];
      for (const file of req.files) {
        const response = await fetch(file.path);
        const buffer = Buffer.from(await response.arrayBuffer());
        const jpegBuffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();

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
    console.error("POST /requests error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =======================
// 🔹 DELETE une demande (client)
// =======================
router.delete("/:id", auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Demande introuvable" });
    if (request.client.toString() !== req.user.id) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    await request.deleteOne();
    res.json({ message: "Demande supprimée" });
  } catch (err) {
    console.error("DELETE /requests/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// 🔹 POST offre (pro)
// =======================
router.post("/:id/offer", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "pro") return res.status(403).json({ error: "Seulement pour les pros" });

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

    res.json({ message: "Offre envoyée" });
  } catch (err) {
    console.error("POST /requests/:id/offer error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// 🔹 POST accepter une offre (client)
// =======================
router.post("/:id/accept/:offerId", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "client") return res.status(403).json({ error: "Seulement pour les clients" });

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

    res.json({ message: "Offre acceptée" });
  } catch (err) {
    console.error("POST /requests/:id/accept/:offerId error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// 🔹 POST envoyer un message (client/pro)
// =======================
router.post("/:id/message", auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: "Message vide" });

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Demande introuvable" });

let conversation = await Conversation.findOne({
  request: req.params.id,
  $or: [
    { pro: req.user.id },
    { client: req.user.id }
  ]
});

    if (!conversation) {
      conversation = new Conversation({
        request: request._id,
        client: request.client,
        pro: req.user.role === "pro" ? req.user.id : req.body.proId,
        messages: [],
      });
    }

    const newMessage = {
      from: req.user.id,
      content,
      readBy: [req.user.id],
      createdAt: new Date(),
    };

    conversation.messages.push(newMessage);
    await conversation.save();
    await conversation.populate("messages.from", "name profileImage");

    res.json({ messages: conversation.messages });
  } catch (err) {
    console.error("POST /requests/:id/message error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;