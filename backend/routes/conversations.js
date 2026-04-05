const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");

const Conversation = require("../models/Conversation");
const Request = require("../models/Request");
const User = require("../models/User");
const Notification = require("../models/Notification");
const {createNotification} = require("../services/notificationService")

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

    const userId = req.user.id.toString();

    const isClient =
      conversation.client._id
        ? conversation.client._id.toString() === userId
        : conversation.client.toString() === userId;

    const isPro =
      conversation.pro._id
        ? conversation.pro._id.toString() === userId
        : conversation.pro.toString() === userId;

    if (!isClient && !isPro) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    // 🧠 champs de lecture
    const updateFields = {
      lastInteractionAt: new Date(),
      lastInteractionBy: req.user.id,
    };

    if (isClient) {
      updateFields.lastReadByClient = new Date();
      updateFields.lastReviewReadByClient = new Date();
    }

    if (isPro) {
      updateFields.lastReadByPro = new Date();
      updateFields.lastReviewReadByPro = new Date();
    }

    // ⚡ update messages + conversation
    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $set: updateFields,
        $addToSet: {
          "messages.$[msg].readBy": req.user.id,
        },
      },
      {
        arrayFilters: [{ "msg.readBy": { $ne: req.user.id } }],
      }
    );

    // 🔥 IMPORTANT : marquer les notifications comme lues
    const Notification = require("../models/Notification");

    await Notification.updateMany(
      {
        userId: req.user.id,
        "data.conversationId": conversation._id,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    // 🔄 refresh conversation
    const updatedConversation = await Conversation.findById(req.params.id)
      .populate("client", "name profileImage")
      .populate("pro", "name profileImage")
      .populate("messages.from", "name profileImage");

    res.json(updatedConversation);
  } catch (err) {
    console.error("GET /conversations/:id error:", err);
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
    const emailRegex = /\b[A-Z0-9._%+-]+(@|\(at\)|\[at\]|\sat\s)[A-Z0-9.-]+(\.|\(dot\)|\[dot\]|\sdot\s)[A-Z]{2,}\b/i;
    const phoneRegex = /(\+?\d{1,3}[\s.-]?)?(\(?\d{1,3}\)?[\s.-]?)?(\d[\s.-]?){6,}/;

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

if (isClient) {
  conversation.lastClientUpdateAt = new Date();
}
if (isPro) {
  conversation.lastProUpdateAt = new Date(); // ⭐ MANQUAIT
}
    await conversation.save();

    const receiverId = isClient ? conversation.pro : conversation.client;

await createNotification({
  userId: receiverId,
  type: "message",
  requestId: conversation.request,
  conversationId: conversation._id
});
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

    if (!conversation) {
      return res.status(404).json({ error: "Conversation introuvable" });
    }

    // 🔒 Vérifier que l'utilisateur appartient à la conversation
    const isClient = conversation.client.toString() === req.user.id.toString();
    const isPro = conversation.pro.toString() === req.user.id.toString();

    if (!isClient && !isPro) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    // 🧠 Mettre à jour le bon champ selon le rôle
    const updateFields = {};

if (isPro) {
  updateFields.lastReadByPro = new Date();
}

if (isClient) {
  updateFields.lastReadByClient = new Date();
}

const updateQuery = {
  $addToSet: {
    "messages.$[msg].readBy": req.user.id
  }
};

if (Object.keys(updateFields).length > 0) {
  updateQuery.$set = updateFields;
}

await Conversation.updateOne(
  { _id: conversation._id },
  updateQuery,
  {
    arrayFilters: [{ "msg.readBy": { $ne: req.user.id } }]
  }
);

    res.json({ success: true });

  } catch (err) {
    console.error("POST /conversations/:id/mark-read error:", err);
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
  conversation.dealProposedByClient = true;
  conversation.lastInteractionAt = new Date();
  conversation.lastInteractionBy = req.user.id;
  conversation.lastClientUpdateAt = new Date();

  await conversation.save();

  await createNotification({
  userId: conversation.pro === req.user.id ? conversation.client : conversation.pro,
  type: "deal",
  requestId: conversation.request,
  conversationId: conversation._id
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
        type: "deal",
requestId: conversation.request,
        conversationId: conversation._id
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

if (req.user.role === "client") {
  conversation.lastClientUpdateAt = new Date();
}

if (req.user.role === "pro") {
  conversation.lastProUpdateAt = new Date();
}
    await conversation.save();

    const receiverId =
  req.user.id === conversation.client.toString()
    ? conversation.pro
    : conversation.client;

await createNotification({
  userId: receiverId,
  type: "deal",
  requestId: conversation.request,
  conversationId: conversation._id,
  senderId: req.user.id
});

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