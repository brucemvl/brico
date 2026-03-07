const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");

const Conversation = require("../models/Conversation");
const Request = require("../models/Request");

// 🔹 GET toutes les conversations ou par requestId
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

// 🔹 Créer une conversation
router.post("/start", auth, async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ error: "Demande introuvable" });

    let conversation = await Conversation.findOne({
      request: requestId,
      pro: req.user.id
    });

    if (!conversation) {
      conversation = new Conversation({
        request: requestId,
        client: request.client,
        pro: req.user.id,
        messages: []
      });
      await conversation.save();
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Récupérer une conversation spécifique
router.get("/:id", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate("client", "name profileImage")
      .populate("pro", "name profileImage")
      .populate("messages.from", "name profileImage");

    if (!conversation) return res.status(404).json({ error: "Conversation introuvable" });

    // marquer messages comme lus
    conversation.messages.forEach(msg => {
      if (!msg.readBy.includes(req.user.id)) msg.readBy.push(req.user.id);
    });
    await conversation.save();

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Envoyer un message
router.post("/:id/message", auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: "Message vide" });

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ error: "Conversation introuvable" });

    conversation.messages.push({
      from: req.user.id,
      content,
      readBy: [req.user.id],
      createdAt: new Date()
    });

    await conversation.save();
    await conversation.populate("messages.from", "name profileImage");

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Marquer messages comme lus
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

module.exports = router;