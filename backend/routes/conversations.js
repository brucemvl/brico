const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");

const Conversation = require("../models/Conversation");
const Request = require("../models/Request");
const { createNotification } = require("../services/notificationService");
const User = require("../models/User");

// =======================
// 🔹 GET toutes les conversations ou par requestId
// =======================
router.get("/", auth, async (req, res) => {
  try {
    const { requestId } = req.query;
    let filter = { $or: [{ client: req.user.id }, { pro: req.user.id }] };
    if (requestId) filter.request = requestId;

    const conversations = await Conversation.find(filter)
      .populate("client", "name profileImage")
      .populate("pro", "name profileImage")
      .populate("messages.from", "name profileImage");

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// 🔹 Récupérer une conversation spécifique et marquer comme lue
// =======================
router.get("/:id", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate("client", "name profileImage")
      .populate("pro", "name profileImage")
      .populate("messages.from", "name profileImage");

    if (!conversation) {
      return res.status(404).json({ error: "Conversation introuvable" });
    }

    const isClient = conversation.client._id
      ? conversation.client._id.toString() === req.user.id.toString()
      : conversation.client.toString() === req.user.id.toString();

    const isPro = conversation.pro._id
      ? conversation.pro._id.toString() === req.user.id.toString()
      : conversation.pro.toString() === req.user.id.toString();

    if (!isClient && !isPro) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    conversation.messages.forEach(msg => {
      const alreadyRead = msg.readBy.some(id => id.toString() === req.user.id.toString());
      if (!alreadyRead) {
        msg.readBy.push(req.user.id);
      }
    });

    await conversation.save();

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// 🔹 Envoyer un message
// =======================
router.post("/:id/message", auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message vide" });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation introuvable" });
    }

    const request = await Request.findById(conversation.request);
    if (!request) {
      return res.status(404).json({ error: "Demande introuvable" });
    }

    const isClient = conversation.client.toString() === req.user.id.toString();
    const isPro = conversation.pro.toString() === req.user.id.toString();

    if (!isClient && !isPro) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const text = content;
    const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
    const phoneRegex = /(\+?\d[\d\s]{7,})/;

    const dealAccepted =
      (conversation.dealProposedByPro && conversation.dealAcceptedByClient) ||
      (conversation.dealProposedByClient && conversation.dealAcceptedByPro);

    if ((emailRegex.test(text) || phoneRegex.test(text)) && !dealAccepted) {
      return res.status(403).json({
        error: "Les coordonnées sont bloquées tant que l'accord n'est pas validé.",
      });
    }

    conversation.messages.push({
      from: req.user.id,
      content,
      readBy: [req.user.id],
      createdAt: new Date()
    });

    conversation.lastInteractionAt = new Date();
    conversation.lastInteractionBy = req.user.id;

    await conversation.save();
    await conversation.populate("messages.from", "name profileImage");

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// 🔹 Marquer messages comme lus
// =======================
router.post("/:id/mark-read", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation introuvable" });

    conversation.messages.forEach(msg => {
      if (!msg.readBy.includes(req.user.id)) msg.readBy.push(req.user.id);
    });

    await conversation.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// 🔹 Proposer un deal (client ou pro)
// =======================
router.post("/:id/propose-deal", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation introuvable" });

    if (req.user.id === conversation.client.toString()) {
      // 🔹 Client propose un deal
      conversation.dealProposedByClient = true;
      await conversation.save();

      await createNotification({
        userId: conversation.pro,
        type: "new_offer",
        content: "Le client propose un deal",
        relatedRequest: conversation.request,
        conversation: conversation._id
      });

      return res.json({ message: "Proposition envoyée au pro" });
    }

    if (req.user.id === conversation.pro.toString()) {
      // 🔹 Propose un deal
      conversation.dealProposedByPro = true;

      conversation.lastInteractionAt = new Date();
conversation.lastInteractionBy = req.user.id;

      await conversation.save();

      await createNotification({
        userId: conversation.client,
        type: "new_offer",
        content: "Le pro propose un deal",
        relatedRequest: conversation.request,
        conversation: conversation._id
      });

      return res.json({ message: "Proposition envoyée au client" });
    }

    return res.status(403).json({ error: "Non autorisé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

//ACCEPTER DEAL
router.post("/:id/accept-deal", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation introuvable" });
    }

    if (req.user.id === conversation.client.toString()) {
      conversation.dealAcceptedByClient = true;
    }

    if (req.user.id === conversation.pro.toString()) {
      conversation.dealAcceptedByPro = true;
    }

    const dealAccepted =
      (conversation.dealProposedByPro && conversation.dealAcceptedByClient) ||
      (conversation.dealProposedByClient && conversation.dealAcceptedByPro);

    conversation.lastInteractionAt = new Date();
    conversation.lastInteractionBy = req.user.id;

    await conversation.save();

    if (dealAccepted) {
      const request = await Request.findById(conversation.request);

      if (request) {
        request.status = "in_progress";

        const existingAssignment = request.assignedPros.find(
          ap => ap.pro.toString() === conversation.pro.toString()
        );

        if (!existingAssignment) {
          request.assignedPros.push({
            pro: conversation.pro,
            status: "active",
            agreedAt: new Date(),
            reviewByClient: false,
            reviewByPro: false,
          });
        } else {
          existingAssignment.status = "active";
          existingAssignment.agreedAt = new Date();
          existingAssignment.cancelledAt = undefined;
          existingAssignment.completedAt = undefined;
        }

        await request.save();
      }
    }

    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// 🔹 Finaliser le deal et obtenir coordonnées (client ou pro) - version conversation-safe
// =======================
router.get("/:id/contact", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate("client", "email phone")
      .populate("pro", "email phone");

    if (!conversation) return res.status(404).json({ error: "Conversation introuvable" });

    if (!(
      (conversation.dealProposedByPro && conversation.dealAcceptedByClient) ||
      (conversation.dealProposedByClient && conversation.dealAcceptedByPro)
    )) {
      return res.status(403).json({ error: "Le deal n'a pas encore été accepté" });
    }

    const otherUser = req.user.id === conversation.client._id.toString()
      ? conversation.pro
      : conversation.client;

    res.json({ phone: otherUser.phone, email: otherUser.email });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
module.exports = router;