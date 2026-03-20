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
      .populate("proAssigned", "name profileImage");

    const conversations = await Conversation.find({ client: req.user.id });

    const formatted = requests.map(r => {
      const conv = conversations.find(c => c.request.toString() === r._id.toString());
      const hasUnread =
        conv &&
        conv.lastInteractionBy &&
        conv.lastInteractionBy.toString() !== req.user.id;
      return { ...r.toObject(), hasUnread };
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
    // 🔹 Récupérer l'ID du pro depuis le token
    const proId = req.user.id || req.user._id;

    // 🔹 Vérifier que l'utilisateur existe
    const user = await User.findById(proId);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    // 🔹 Récupérer toutes les demandes ouvertes ou en cours
    // "in_progress" si le pro est assigné, "open" pour toutes
    const requests = await Request.find({
      $or: [
        { status: { $in: ["open"] } },
        { status: "in_progress", proAssigned: proId }
      ]
    });

    // 🔹 Récupérer les conversations du pro pour calculer hasUnread
    const conversations = await Conversation.find({ pro: proId });

    // 🔹 Préparer les demandes avec hasUnread
    const requestsWithUnread = requests.map(r => {
      const conv = conversations.find(c => c.request.toString() === r._id.toString());
      const hasUnread =
        conv?.messages?.some(msg => msg.from.toString() !== proId && !msg.readBy.includes(proId)) || false;

      return {
        _id: r._id,
        title: r.title,
        category: r.category,
        location: r.location,
        budget: r.budget,
        status: r.status,
        hasUnread,
        proAssigned: r.proAssigned ? r.proAssigned.toString() : undefined,
      };
    });

    // 🔹 Retourner à l’API frontend
    res.json({
      requests: requestsWithUnread,
      skills: user.skills || []
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
      .populate("proAssigned", "name profileImage");

    if (!request) return res.status(404).json({ error: "Demande introuvable" });

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
      lastInteractionBy: req.user.id,
      lastInteractionAt: new Date()
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
    type: "new_request",
    request: newRequest._id
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
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: "Message vide" });

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Demande introuvable" });

    let conversation;

    if (req.user.role === "pro") {
      // 🔹 Le pro envoie un message
      conversation = await Conversation.findOne({
        request: request._id,
        pro: req.user.id,
      });

      if (!conversation) {
        // ⚠️ créer une nouvelle conversation côté pro
        conversation = new Conversation({
          request: request._id,
          client: request.client,
          pro: req.user.id,
          messages: [],
        });
      }

    } else if (req.user.role === "client") {
      // 🔹 Le client envoie un message
      if (!request.proAssigned) {
        return res.status(400).json({ error: "Aucun pro assigné pour cette demande" });
      }

      conversation = await Conversation.findOne({
        request: request._id,
        pro: request.proAssigned,
        client: req.user.id,
      });

      if (!conversation) {
        conversation = new Conversation({
          request: request._id,
          client: req.user.id,
          pro: request.proAssigned,
          messages: [],
        });
      }
    }

    // Ajouter le message
    conversation.messages.push({
      from: req.user.id,
      content,
      readBy: [req.user.id],
      createdAt: new Date(),
    });

    await conversation.save();
    await conversation.populate("messages.from", "name profileImage");

    // 🔔 Notification nouveau message
let receiverId;

if (req.user.role === "pro") {
  receiverId = conversation.client;
} else {
  receiverId = conversation.pro;
}

await createNotification({
  userId: receiverId,
  type: "new_message",
  request: request._id,
  conversation: conversation._id
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
    if (!req.user || req.user.role !== "client")
      return res.status(403).json({ error: "Seulement pour les clients" });

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Demande introuvable" });

    const offer = request.offers.id(req.params.offerId);
    if (!offer) return res.status(404).json({ error: "Offre introuvable" });

    if (offer.accepted) return res.status(400).json({ error: "Offre déjà acceptée" });

    // 🔹 Marquer cette offre comme acceptée
    offer.accepted = true;

    // 🔹 Assigner le pro et stocker l'offre acceptée
    request.proAssigned = offer.pro;
    request.acceptedOffer = offer.toObject();
    request.status = "in_progress";

    await request.save();

    // 🔹 Créer la conversation côté client si elle n'existe pas
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
      await conversation.save();
    }

    // 🔹 Notification au pro choisi
    await createNotification({
      userId: offer.pro,
      type: "offer_accepted",
      content: "Votre offre a été acceptée 🎉",
      relatedRequest: request._id,
    });

    res.json({ message: "Offre acceptée", proAssigned: request.proAssigned });
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
    const request = await Request.findById(req.params.id)
      .populate("client", "email phone name")
      .populate("proAssigned", "email phone name");

    if (!request) return res.status(404).json({ error: "Demande introuvable" });

    // 🔹 Déterminer le pro à utiliser pour la conversation
    let conversationProId;
    if (req.user.role === "client") {
      // côté client : toujours la conversation avec le pro assigné
      conversationProId = request.proAssigned;
      if (!conversationProId) {
        return res.status(400).json({ error: "Aucun pro assigné pour cette demande" });
      }
    } else if (req.user.role === "pro") {
      // côté pro : utiliser son propre ID pour retrouver la conversation
      conversationProId = req.user.id;
    }

    // 🔹 Chercher la conversation
    const conversation = await Conversation.findOne({
      request: request._id,
      client: request.client,
      pro: conversationProId,
    })
      .populate("client", "name email phone")
      .populate("pro", "name email phone");

    if (!conversation) return res.status(404).json({ error: "Conversation introuvable" });

    // 🔹 Vérifier si le deal est accepté
    const dealAccepted =
      (conversation.dealProposedByClient && conversation.dealAcceptedByPro) ||
      (conversation.dealProposedByPro && conversation.dealAcceptedByClient);

    if (!dealAccepted) {
      return res.status(403).json({ error: "Le deal n'a pas encore été accepté par les deux parties" });
    }

    // 🔹 Déterminer qui voit les coordonnées
    let otherUser;
    if (req.user.role === "client") {
      otherUser = conversation.pro;
    } else if (req.user.role === "pro") {
      otherUser = conversation.client;
    }

    res.json({ phone: otherUser.phone, email: otherUser.email });
  } catch (err) {
    console.error("GET /requests/:id/contact error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
module.exports = router;