const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Request = require("../models/Request");
const Conversation = require("../models/Conversation");
const { createNotification } = require("../services/notificationService");
const upload = require("../middlewares/uploadCloudinary");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const sharp = require("sharp");
const fetch = require("node-fetch");
const User = require("../models/User");


// 🔒 Fonction de détection avancée
const containsContactInfo = (text) => {
  if (!text) return false;

  // Email classique + variantes simples (ex: test(at)gmail.com)
  const emailRegex =
    /\b[A-Z0-9._%+-]+(@|\(at\)|\[at\]|\sat\s)[A-Z0-9.-]+(\.|\(dot\)|\[dot\]|\sdot\s)[A-Z]{2,}\b/i;

  // Numéro FR + international + formats variés
  const phoneRegex =
    /(\+?\d{1,3}[\s.-]?)?(\(?\d{1,3}\)?[\s.-]?)?(\d[\s.-]?){6,}/;

  return emailRegex.test(text) || phoneRegex.test(text);
};

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
      .populate("assignedPros.pro", "name profileImage")
      .sort({ createdAt: -1 });

    const conversations = await Conversation.find({ client: req.user.id });

    const formatted = requests.map(r => {
      const conv = conversations.find(
        c => c.request.toString() === r._id.toString()
      );

      let unreadType = null;

      if (conv) {
        const isUnread =
          conv.lastProUpdateAt &&
          (!conv.lastReadByClient ||
            new Date(conv.lastProUpdateAt) > new Date(conv.lastReadByClient));

        if (isUnread) {
          if (conv.dealProposedByPro && !conv.dealAcceptedByClient) {
            unreadType = "deal";
          } else if (
            conv.messages?.some(
              msg =>
                msg.from.toString() !== req.user.id.toString() &&
                !msg.readBy.includes(req.user.id)
            )
          ) {
            unreadType = "message";
          } else {
            unreadType = "update";
          }
        }
      }

      return {
        ...r.toObject(),
        hasUnread: !!unreadType,
        unreadType
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("GET /requests/client error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =======================
// 🔹 GET demandes pour pros
// =======================
router.get("/pro", auth, async (req, res) => {
  try {
    const proId = req.user.id || req.user._id;

    const user = await User.findById(proId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const requests = await Request.find({
      $or: [
        { status: "open" },
        { status: "in_progress" },
        {
          status: "completed",
          assignedPros: {
            $elemMatch: {
              pro: proId,
              status: "completed",
            }
          }
        }
      ]
    });

    const conversations = await Conversation.find({ pro: proId });

    const requestsWithUnread = requests.map(r => {
      const conv = conversations.find(
        c => c.request.toString() === r._id.toString()
      );

      let unreadType = null;

      if (conv) {
        const isUnread =
          conv.lastClientUpdateAt &&
          (!conv.lastReadByPro ||
            new Date(conv.lastClientUpdateAt) > new Date(conv.lastReadByPro));

        if (isUnread) {
          if (conv.dealProposedByClient && !conv.dealAcceptedByPro) {
            unreadType = "deal";
          } else if (
            conv.messages?.some(
              msg =>
                msg.from.toString() !== proId.toString() &&
                !msg.readBy.includes(proId)
            )
          ) {
            unreadType = "message";
          } else {
            unreadType = "update";
          }
        }
      }

      const myAssignment = r.assignedPros?.find(
        ap => ap.pro.toString() === proId.toString()
      );

      return {
        _id: r._id,
        title: r.title,
        category: r.category,
        location: r.location,
        budget: r.budget,
        status: r.status,
        hasUnread: !!unreadType,
        unreadType,
        createdAt: r.createdAt,
        images: r.images || [],
        assignedPros:
          r.assignedPros?.map(ap => ({
            pro: ap.pro.toString(),
            status: ap.status,
            agreedAt: ap.agreedAt,
            cancelledAt: ap.cancelledAt,
            completedAt: ap.completedAt,
            reviewByClient: ap.reviewByClient,
            reviewByPro: ap.reviewByPro,
          })) || [],
        myAssignmentStatus: myAssignment?.status || null,
      };
    });

    res.json({
      requests: requestsWithUnread,
      skills: user.skills || [],
    });
  } catch (err) {
    console.error("GET /requests/pro error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// =======================
// 🔹 GET détail d’une demande + conversations
// =======================
router.get("/:id", auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
  .populate("client", "name profileImage")
  .populate("assignedPros.pro", "name profileImage");
  

    if (!request) return res.status(404).json({ error: "Demande introuvable" });

   if (
  req.user.id.toString() !== request.client.toString()
) {
  await Request.updateOne(
    { _id: req.params.id },
    { $inc: { views: 1 } }
  );
}

    if (req.user.role === "client") {
      const conversations = await Conversation.find({
        request: req.params.id,
        client: req.user.id
      })
        .populate("pro", "name profileImage")
        .populate("messages.from", "name profileImage")
        .sort({ updatedAt: -1 });

         // 🔹 Marquer la conversation comme lue
  await Conversation.updateMany(
  { request: req.params.id, client: req.user.id },
  {
    $set: {
      lastReadByClient: new Date()
    }
  }
);

await Conversation.updateMany(
  { request: req.params.id, pro: req.user.id },
  {
    $set: {
      lastReadByPro: new Date()
    }
  }
);

      return res.json({ ...request.toObject(), conversations });
    }

    if (req.user.role === "pro") {
  const conversation = await Conversation.findOne({
    request: req.params.id,
    pro: req.user.id
  })
    .populate("client", "name profileImage")
    .populate("messages.from", "name profileImage");

  if (conversation) {
    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $set: {
          lastInteractionBy: req.user.id,
        }
      }
    );

    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $set: {
      lastReadByPro: new Date()
    },
        $addToSet: {
          "messages.$[msg].readBy": req.user.id
        }
      },
      {
        arrayFilters: [
          { "msg.readBy": { $ne: req.user.id } }
        ]
      }
    );
  }

  return res.json({ ...request.toObject(), conversation: conversation || null });
}

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

    const { title, description, category, location, budget } = req.body;

    // 🔹 Construire l'objet explicitement
    const newRequest = new Request({
      client: req.user.id,
      title,
      description,
      category,
      location,
      budget,
      images: [],
      offers: [],
      messages: [],
      clientValidated: false,
      proValidated: false
    });

    // 🔹 Upload des images
    if (req.files?.length) {
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

        newRequest.images.push({
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id
        });
      }
    }

    await newRequest.save();

// 🔔 Notifier les pros ayant la compétence
 const pros = await User.find({
  role: "pro",
  skills: category,
  expoPushToken: { $exists: true, $ne: "" } // seulement ceux avec token
}).select("_id expoPushToken");

for (const pro of pros) {
  await createNotification({
    userId: pro._id,
    type: "request",
    requestId: newRequest._id
  });
}

    res.status(201).json(newRequest);
  } catch (err) {
    console.error("POST /requests error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// MODIFICATIONS IMAGES
router.post("/:id/images", auth, upload.array("images"), async (req, res) => {
  try {

    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Demande introuvable" });
    }

    // 🔹 Vérifie que c'est le client propriétaire
    if (request.client.toString() !== req.user.id) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    if (!req.files?.length) {
      return res.status(400).json({ error: "Aucune image envoyée" });
    }

    for (const file of req.files) {

  request.images.push({
    url: file.path,
    public_id: file.filename
  });

}

    await request.save();

    const updated = await Request.findById(req.params.id)
  .populate("client", "name profileImage");

    res.json(updated);

  } catch (err) {
    console.error("POST /requests/:id/images error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

//DELETE UNE IMAGE
router.delete("/:id/images/:imageId", auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Demande introuvable" });

    if (request.client.toString() !== req.user.id)
      return res.status(403).json({ error: "Non autorisé" });

    const image = request.images.find(img => img._id.toString() === req.params.imageId);
    if (!image) return res.status(404).json({ error: "Image introuvable" });

    if (image.public_id) {
      await cloudinary.uploader.destroy(image.public_id);
    }

    request.images = request.images.filter(img => img._id.toString() !== req.params.imageId);
    await request.save();

    res.json({ images: request.images });
  } catch (err) {
    console.error("DELETE /requests/:id/images error:", err);
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
    if (request.client.toString() !== req.user.id) return res.status(403).json({ error: "Non autorisé" });

    await request.deleteOne();
    res.json({ message: "Demande supprimée" });
  } catch (err) {
    console.error("DELETE /requests/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

//MESSAGES COTE PRO

router.post("/:id/message", auth, async (req, res) => {
  try {
    const { content, proId } = req.body;

    // 🔹 Vérification message vide
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message vide" });
    }

    // 🔒 Blocage coordonnées
    if (containsContactInfo(content)) {
      return res.status(400).json({
        error:
          "🔒 Validez un accord afin de pouvoir partager vos coordonnées"
      });
    }

    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Demande introuvable" });
    }

    let conversation;

    if (req.user.role === "pro") {
      conversation = await Conversation.findOne({
        request: request._id,
        pro: req.user.id,
      });

      if (!conversation) {
        conversation = new Conversation({
          request: request._id,
          client: request.client,
          pro: req.user.id,
          messages: [],
        });
      }

      conversation.lastReadByPro = new Date();

    } else if (req.user.role === "client") {
      if (!proId) {
        return res.status(400).json({ error: "proId requis côté client" });
      }

      conversation = await Conversation.findOne({
        request: request._id,
        pro: proId,
        client: req.user.id,
      });

      if (!conversation) {
        conversation = new Conversation({
          request: request._id,
          client: req.user.id,
          pro: proId,
          messages: [],
        });
      }

      conversation.lastReadByClient = new Date();
    }

    // 🔹 Ajout message
    conversation.messages.push({
      from: req.user.id,
      content,
      readBy: [req.user.id],
      createdAt: new Date(),
    });

    // 🔹 Updates activité
    conversation.lastInteractionBy = req.user.id;
    conversation.lastInteractionAt = new Date();

    if (req.user.role === "client") {
      conversation.lastClientUpdateAt = new Date();
    }

    if (req.user.role === "pro") {
      conversation.lastProUpdateAt = new Date();
    }

    await conversation.save();
    await conversation.populate("messages.from", "name profileImage");

    const receiverId =
      req.user.role === "pro"
        ? conversation.client
        : conversation.pro;

    await createNotification({
      userId: receiverId,
      type: "message",
      requestId: request._id,
      conversationId: conversation._id,
      senderId: req.user.id
    });

    res.json(conversation);

  } catch (err) {
    console.error(err);
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
if (!request || request.status === "completed") {
  return res.status(400).json({ error: "Demande invalide" });
}
    const alreadyOffered = request.offers?.find(o => o.pro.toString() === req.user.id);
    if (alreadyOffered) return res.status(400).json({ error: "Offre déjà envoyée" });

    const alreadyActive = request.assignedPros?.some(
  ap => ap.pro.toString() === req.user.id && ap.status === "active"
);

if (alreadyActive) {
  return res.status(400).json({ error: "Vous avez déjà un accord actif sur cette demande" });
}

    request.offers.push({ pro: req.user.id, price, proposedDate, message });
    await request.save();

    await createNotification({
      userId: request.client,
      type: "deal",
      content: "Un professionnel a envoyé une offre",
      requestId: request._id,
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
    if (!req.user || req.user.role !== "client") {
      return res.status(403).json({ error: "Seulement pour les clients" });
    }

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Demande introuvable" });

    const offer = request.offers.id(req.params.offerId);
    if (!offer) return res.status(404).json({ error: "Offre introuvable" });

    if (request.status === "completed") {
      return res.status(400).json({ error: "La mission est déjà terminée" });
    }

    offer.accepted = true;

    const alreadyAssigned = request.assignedPros.find(
      ap => ap.pro.toString() === offer.pro.toString() && ap.status === "active"
    );

    if (!alreadyAssigned) {
      request.assignedPros.push({
        pro: offer.pro,
        status: "active",
        acceptedOffer: offer.toObject(),
        agreedAt: new Date(),
        reviewByClient: false,
        reviewByPro: false,
      });
    }

    request.status = "in_progress";

    await request.save();

    let conversation = await Conversation.findOne({
      request: request._id,
      client: request.client,
      pro: offer.pro
    });

    if (!conversation) {
      conversation = new Conversation({
        request: request._id,
        client: request.client,
        pro: offer.pro,
        messages: []
      });

      conversation.lastInteractionBy = req.user.id;
conversation.lastInteractionAt = new Date();

      await conversation.save();
    }

    await createNotification({
      userId: offer.pro,
      type: "offer_accepted",
      requestId: request._id,
    });

    res.json({ message: "Offre acceptée", assignedPros: request.assignedPros });
  } catch (err) {
    console.error("POST /requests/:id/accept/:offerId error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// 🔹 Obtenir les coordonnées pour une demande
// =======================
router.get("/:id/contact", auth, async (req, res) => {
  try {
    const { proId } = req.query;

    const request = await Request.findById(req.params.id)
      .populate("client", "email phone name")
      .populate("assignedPros.pro", "email phone name");

    if (!request) return res.status(404).json({ error: "Demande introuvable" });

    let conversationProId;

    if (req.user.role === "client") {
      if (!proId) {
        return res.status(400).json({ error: "proId requis côté client" });
      }
      conversationProId = proId;
    } else if (req.user.role === "pro") {
      conversationProId = req.user.id;
    }

    const conversation = await Conversation.findOne({
      request: request._id,
      client: request.client,
      pro: conversationProId,
    })
      .populate("client", "name email phone")
      .populate("pro", "name email phone");

    if (!conversation) {
      return res.status(404).json({ error: "Conversation introuvable" });
    }

    const dealAccepted =
      (conversation.dealProposedByClient && conversation.dealAcceptedByPro) ||
      (conversation.dealProposedByPro && conversation.dealAcceptedByClient);

    if (!dealAccepted) {
      return res.status(403).json({ error: "Le deal n'a pas encore été accepté par les deux parties" });
    }

    const otherUser = req.user.role === "client"
      ? conversation.pro
      : conversation.client;

    res.json({ phone: otherUser.phone, email: otherUser.email });
  } catch (err) {
    console.error("GET /requests/:id/contact error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:id/review-complete", auth, async (req, res) => {
  try {
    const { proId } = req.body;

    if (!proId) {
      return res.status(400).json({ error: "proId requis" });
    }

    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Demande introuvable" });
    }

    const assignment = request.assignedPros.find(
      ap => ap.pro.toString() === proId.toString()
    );

    if (!assignment) {
      return res.status(404).json({ error: "Aucune relation trouvée avec ce pro" });
    }

    if (req.user.role === "client") {
      if (request.client.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: "Non autorisé" });
      }
      assignment.reviewByClient = true;
    }

    if (req.user.role === "pro") {
      if (req.user.id.toString() !== proId.toString()) {
        return res.status(403).json({ error: "Non autorisé" });
      }
      assignment.reviewByPro = true;
    }

    if (assignment.reviewByClient && assignment.reviewByPro) {
      request.status = "completed";

      request.assignedPros.forEach(ap => {
        if (ap.pro.toString() === proId.toString()) {
          ap.status = "completed";
          ap.completedAt = new Date();
        } else if (ap.status === "active") {
          ap.status = "cancelled";
          ap.cancelledAt = new Date();
        }
      });
    }

    await request.save();

    const conversation = await Conversation.findOne({
  request: request._id,
  pro: proId,
  client: request.client,
});

if (conversation) {
  conversation.lastInteractionBy = req.user.id;
  conversation.lastInteractionAt = new Date();
  conversation.lastReviewAt = new Date();
  await conversation.save();
}

    return res.json({
      message: "Statut de notation mis à jour",
      status: request.status,
      assignment,
      assignedPros: request.assignedPros,
    });
  } catch (err) {
    console.error("POST /requests/:id/review-complete error:", err);
    return res.status(500).json({ error: err.message });
  }
});

//PROPOSER UN ACCORD DIRECTEMENT SANS MESSAGE
router.post("/:id/propose-deal", auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Demande introuvable" });
    }

    let conversation;

    if (req.user.role === "pro") {
      conversation = await Conversation.findOne({
        request: request._id,
        pro: req.user.id,
        client: request.client,
      });

      if (!conversation) {
        conversation = new Conversation({
          request: request._id,
          client: request.client,
          pro: req.user.id,
          messages: [],
        });
      }

      conversation.dealProposedByPro = true;
conversation.lastInteractionAt = new Date();
conversation.lastInteractionBy = req.user.id;
conversation.lastProUpdateAt = new Date();

      await conversation.save();

      await createNotification({
        userId: request.client,
        type: "deal",
        content: "Le pro propose un deal",
        requestId: request._id,
        conversationId: conversation._id,
      });

      return res.json({
        message: "Proposition envoyée au client",
        conversation,
      });
    }

    if (req.user.role === "client") {
      const { proId } = req.body;

      if (!proId) {
        return res.status(400).json({ error: "proId requis côté client" });
      }

      conversation = await Conversation.findOne({
        request: request._id,
        pro: proId,
        client: req.user.id,
      });

      if (!conversation) {
        conversation = new Conversation({
          request: request._id,
          client: req.user.id,
          pro: proId,
          messages: [],
        });
      }

      conversation.dealProposedByClient = true;
      conversation.lastInteractionAt = new Date();
      conversation.lastInteractionBy = req.user.id;
      conversation.lastClientUpdateAt = new Date();

      await conversation.save();

      await createNotification({
        userId: proId,
        type: "deal",
        content: "Le client propose un deal",
        requestId: request._id,
        conversationId: conversation._id,
      });

      return res.json({
        message: "Proposition envoyée au pro",
        conversation,
      });
    }

    return res.status(403).json({ error: "Non autorisé" });
  } catch (err) {
    console.error("POST /requests/:id/propose-deal error:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;