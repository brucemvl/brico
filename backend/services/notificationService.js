const Notification = require("../models/Notification");
const User = require("../models/User");
const sendPushNotification = require("../utils/sendPushNotification");

async function createNotification({ userId, type, requestId, conversationId, senderId }) {

const allowedTypes = ["message", "deal", "review", "request", "offer_accepted"];

  let senderName = "Quelqu’un";

if (senderId) {
  const sender = await User.findById(senderId).select("name");
  if (sender) senderName = sender.name;
}

  if (!allowedTypes.includes(type)) {
    console.warn("Type de notification inconnu:", type);
    return;
  }

  let notif;

  const existing = await Notification.findOne({
    userId,
    type: "message",
    isRead: false,
    "data.conversationId": conversationId
  });

  if (existing) {
    existing.updatedAt = new Date();
    await existing.save();
    notif = existing;
  } else {
    notif = await Notification.create({
      userId,
      type,
      isRead: false,
      data: {
        requestId: requestId || null,
        conversationId: conversationId || null
      }
    });
  }

  // 🔔 PUSH (toujours envoyé)
const user = await User.findById(userId).select("expoPushToken notificationPreferences");

if (!user) return;

// 🔕 Vérifier préférences
if (user.notificationPreferences && user.notificationPreferences[type] === false) {
  return; // ❌ on n'envoie pas la notif
}

  if (user?.expoPushToken) {
    let title = "Notification";

    if (type === "message") title = "💬 Message";
    if (type === "deal") title = "🤝 Proposition";
    if (type === "request") title = "📢 Nouvelle demande";
        if (type === "offer_accepted") title = "🤝 Accord accepté";



    let body = "Nouvelle notification";

    if (type === "request") body = "Nouvelle demande disponible";
    if (type === "message") {
 body = senderName !== "Quelqu’un"
  ? `${senderName} vous a envoyé un message`
  : "Vous avez reçu un message";
}
    if (type === "deal") body = "Nouvelle proposition";
    if (type === "review") body = "Nouvel avis reçu";

    await sendPushNotification(
      [user.expoPushToken],
      title,
      body,
      {
        requestId: requestId || null,
        conversationId: conversationId || null
      }
    );
  }

  return notif;
}

module.exports = { createNotification };