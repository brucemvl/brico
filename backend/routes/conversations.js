const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const upload = require("../middlewares/uploadCloudinary");
const Conversation = require("../models/Conversation");
const Request = require("../models/Request");
const User = require("../models/User");
const Notification = require("../models/Notification");
const {createNotification} = require("../services/notificationService")


const containsContactInfo = (text) => {
  if (!text) return false;

  const emailRegex =
    /\b[A-Z0-9._%+-]+(@|\(at\)|\[at\]|\sat\s)[A-Z0-9.-]+(\.|\(dot\)|\[dot\]|\sdot\s)[A-Z]{2,}\b/i;

  const phoneRegex =
    /(\+?\d{1,3}[\s.-]?)?(\(?\d{1,3}\)?[\s.-]?)?(\d[\s.-]?){6,}/;

  return emailRegex.test(text) || phoneRegex.test(text);
};

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
  .populate("request", "title category")
  .populate("messages.from", "name profileImage")
  .sort({ lastInteractionAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CONVERSATION DIRECT

router.post("/direct", auth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== "client") {
      return res.status(403).json({
        error: "Seuls les clients peuvent démarrer une conversation directe"
      });
    }

    const { proId, content, requestId } = req.body;

    if (!proId) {
      return res.status(400).json({ error: "proId requis" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message vide" });
    }

    const pro = await User.findOne({
      _id: proId,
      role: "pro"
    });

    if (!pro) {
      return res.status(404).json({
        error: "Professionnel introuvable"
      });
    }

    // Vérifier la demande si le client en a sélectionné une
    let request = null;

    if (requestId) {
      request = await Request.findById(requestId);

      if (!request) {
        return res.status(404).json({
          error: "Demande introuvable"
        });
      }

      if (request.client.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          error: "Cette demande ne vous appartient pas"
        });
      }
    }

    // Chercher une conversation existante avec ce professionnel
    const filter = {
      client: req.user.id,
      pro: proId,
      request: request ? request._id : null
    };

    let conversation = request
      ? await Conversation.findOne(filter)
      : await Conversation.findOne({
          ...filter,
          type: "direct"
        });

    if (!conversation) {
  conversation = new Conversation({
    type: request ? "request" : "direct",
    request: request ? request._id : null,
    client: req.user.id,
    pro: proId,
    messages: []
  });
}

    // Même règle de blocage des coordonnées que les autres conversations
    const dealAccepted =
      (conversation.dealProposedByPro && conversation.dealAcceptedByClient) ||
      (conversation.dealProposedByClient && conversation.dealAcceptedByPro);

    if (containsContactInfo(content) && !dealAccepted) {
      return res.status(403).json({
        error: "Les coordonnées sont bloquées tant que l'accord n'est pas validé."
      });
    }

    conversation.messages.push({
      from: req.user.id,
      content: content.trim(),
      images: [],
      readBy: [req.user.id],
      createdAt: new Date()
    });

    conversation.lastInteractionAt = new Date();
    conversation.lastInteractionBy = req.user.id;
    conversation.lastClientUpdateAt = new Date();

    await conversation.save();

    await createNotification({
      userId: proId,
      type: "message",
      requestId: conversation.request || null,
      conversationId: conversation._id,
      senderId: req.user.id
    });

    await conversation.populate("client", "name profileImage");
    await conversation.populate("pro", "name profileImage");
    await conversation.populate("messages.from", "name profileImage");

    return res.status(201).json(conversation);

  } catch (err) {
    console.error("POST /conversations/direct error:", err);
    return res.status(500).json({ error: err.message });
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

    let request = null;

if (conversation.request) {
  request = await Request.findById(conversation.request);

  if (!request) {
    return res.status(404).json({
      error: "Demande introuvable"
    });
  }
} else if (conversation.type !== "direct") {
  return res.status(400).json({
    error: "Conversation invalide"
  });
}

    const isClient = conversation.client.toString() === req.user.id.toString();
    const isPro = conversation.pro.toString() === req.user.id.toString();

    if (!isClient && !isPro) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const dealAccepted =
  (conversation.dealProposedByPro && conversation.dealAcceptedByClient) ||
  (conversation.dealProposedByClient && conversation.dealAcceptedByPro);

if (containsContactInfo(content) && !dealAccepted) {
  return res.status(403).json({
    error: "Les coordonnées sont bloquées tant que l'accord n'est pas validé."
  });
}

    conversation.messages.push({
  from: req.user.id,
  content: content.trim(),
  images: [],
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
  conversationId: conversation._id,
    senderId: req.user.id
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
      return res.status(404).json({
        error: "Conversation introuvable"
      });
    }

    // Vérifier que l'utilisateur appartient à la conversation
    const userId = req.user.id.toString();

    const isClient = conversation.client.toString() === userId;
    const isPro = conversation.pro.toString() === userId;

    if (!isClient && !isPro) {
      return res.status(403).json({
        error: "Non autorisé"
      });
    }

    // Mettre à jour le bon champ selon le rôle
    const updateFields = {};

    if (isPro) {
      updateFields.lastReadByPro = new Date();
    }

    if (isClient) {
      updateFields.lastReadByClient = new Date();
    }

    const updateQuery = {
      $addToSet: {
        "messages.$[msg].readBy": userId
      },
      $set: updateFields
    };

    await Conversation.updateOne(
      { _id: conversation._id },
      updateQuery,
      {
        arrayFilters: [
          { "msg.readBy": { $ne: userId } }
        ]
      }
    );

    console.log("MARK-READ", {
      conversationId: conversation._id.toString(),
      requestId: conversation.request
  ? conversation.request.toString()
  : null,
      userId,
      role: isPro ? "pro" : "client"
    });

    return res.json({ success: true });

  } catch (err) {
    console.error("POST /conversations/:id/mark-read error:", err);

    if (res.headersSent) {
      return;
    }

    return res.status(500).json({
      error: err.message
    });
  }
});

// =======================
// 🔹 Proposer un accord dans une conversation
// =======================
router.post("/:id/propose-deal", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({
        error: "Conversation introuvable"
      });
    }

    const userId = req.user.id.toString();

    const isClient = conversation.client.toString() === userId;
    const isPro = conversation.pro.toString() === userId;

    if (!isClient && !isPro) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    if (isClient) {
      conversation.dealProposedByClient = true;
      conversation.lastClientUpdateAt = new Date();
    }

    if (isPro) {
      conversation.dealProposedByPro = true;
      conversation.lastProUpdateAt = new Date();
    }

    conversation.lastInteractionAt = new Date();
    conversation.lastInteractionBy = req.user.id;

    await conversation.save();

    const receiverId = isClient
      ? conversation.pro
      : conversation.client;

    await createNotification({
      userId: receiverId,
      type: "deal",
      content: "Une proposition d'accord a été envoyée",
      requestId: conversation.request || null,
      conversationId: conversation._id,
      senderId: req.user.id
    });

    return res.json({
      message: "Proposition d'accord envoyée",
      conversation
    });

  } catch (err) {
    console.error("POST /conversations/:id/propose-deal error:", err);
    return res.status(500).json({ error: err.message });
  }
});

//ACCEPTER DEAL
router.post("/:id/accept-deal", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation introuvable" });
    }

    const userId = req.user.id.toString();

const isClient = conversation.client.toString() === userId;
const isPro = conversation.pro.toString() === userId;

if (!isClient && !isPro) {
  return res.status(403).json({ error: "Non autorisé" });
}

if (isClient && !conversation.dealProposedByPro) {
  return res.status(400).json({
    error: "Aucune proposition du professionnel à accepter"
  });
}

if (isPro && !conversation.dealProposedByClient) {
  return res.status(400).json({
    error: "Aucune proposition du client à accepter"
  });
}

    if (isClient) {
  conversation.dealAcceptedByClient = true;
}

if (isPro) {
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

    const receiverId = isClient
  ? conversation.pro
  : conversation.client;

await createNotification({
  userId: receiverId,
  type: "offer_accepted",
  requestId: conversation.request,
  conversationId: conversation._id,
});

    if (dealAccepted && conversation.request) {
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

    const userId = req.user.id.toString();

const isClient = conversation.client._id.toString() === userId;
const isPro = conversation.pro._id.toString() === userId;

if (!isClient && !isPro) {
  return res.status(403).json({ error: "Non autorisé" });
}

    if (!(
      (conversation.dealProposedByPro && conversation.dealAcceptedByClient) ||
      (conversation.dealProposedByClient && conversation.dealAcceptedByPro)
    )) {
      return res.status(403).json({ error: "Le deal n'a pas encore été accepté" });
    }

    const otherUser = isClient
  ? conversation.pro
  : conversation.client;

    res.json({ phone: otherUser.phone, email: otherUser.email });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

//EPINGLER
router.post("/:id/pin", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation introuvable" });
    }

    const userId = req.user.id.toString();

const isParticipant =
  conversation.client.toString() === userId ||
  conversation.pro.toString() === userId;

if (!isParticipant) {
  return res.status(403).json({ message: "Non autorisé" });
}

   

    if (!conversation.pinnedBy.some(id => id.toString() === userId)) {
      conversation.pinnedBy.push(userId);
      await conversation.save();
    }

    res.json({
      success: true,
      pinned: true,
      pinnedBy: conversation.pinnedBy,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

//DESEPINGLER
router.delete("/:id/pin", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation introuvable" });
    }

    const userId = req.user.id;

    const isParticipant =
  conversation.client.toString() === userId ||
  conversation.pro.toString() === userId;

if (!isParticipant) {
  return res.status(403).json({ message: "Non autorisé" });
}

    conversation.pinnedBy = conversation.pinnedBy.filter(
      id => id.toString() !== userId
    );

    await conversation.save();

    res.json({
      success: true,
      pinned: false,
      pinnedBy: conversation.pinnedBy,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// =======================
// 🔹 Envoyer des photos dans une conversation
// =======================
router.post("/:id/images", auth, upload.uploadImages, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({
        error: "Conversation introuvable"
      });
    }

    // 🔒 Vérifier que l'utilisateur appartient à la conversation
    const isClient =
      conversation.client.toString() === req.user.id.toString();

    const isPro =
      conversation.pro.toString() === req.user.id.toString();

    if (!isClient && !isPro) {
      return res.status(403).json({
        error: "Non autorisé"
      });
    }

    // 📸 Vérifier les fichiers
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: "Aucune image reçue"
      });
    }

    console.log("📸 CONVERSATION_IMAGES", {
      conversationId: conversation._id.toString(),
      userId: req.user.id,
      filesCount: req.files.length
    });

    // 📸 Préparer les images
    const images = req.files.map((file) => ({
      url: file.path,
      public_id: file.filename
    }));

    // 📨 Créer un message contenant les photos
    conversation.messages.push({
      from: req.user.id,
      content: "",
      images,
      readBy: [req.user.id],
      createdAt: new Date()
    });

    // 🔄 Mise à jour de l'activité
    conversation.lastInteractionAt = new Date();
    conversation.lastInteractionBy = req.user.id;

    if (isClient) {
      conversation.lastClientUpdateAt = new Date();
    }

    if (isPro) {
      conversation.lastProUpdateAt = new Date();
    }

    await conversation.save();

    // 👤 Déterminer le destinataire
    const receiverId = isClient
      ? conversation.pro
      : conversation.client;

    // 🔔 Notification
    await createNotification({
      userId: receiverId,
      type: "message",
      requestId: conversation.request,
      conversationId: conversation._id,
      senderId: req.user.id
    });

    // 👤 Re-populate les expéditeurs
    await conversation.populate(
      "messages.from",
      "name profileImage"
    );

    console.log("✅ CONVERSATION_IMAGES_SUCCESS", {
      conversationId: conversation._id.toString(),
      imagesCount: images.length
    });

    return res.json(conversation);

  } catch (err) {
    console.error("❌ CONVERSATION_IMAGES_ERROR:", err);

    return res.status(500).json({
      error: err.message
    });
  }
});
module.exports = router;