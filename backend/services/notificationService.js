const Notification = require("../models/Notification");
const User = require("../models/User");
const sendPushNotification = require("../utils/sendPushNotification");

async function createNotification({ userId, type, requestId, conversationId }) {

  // ✅ types autorisés
  const allowedTypes = ["message", "deal", "review", "request"];

  if (!allowedTypes.includes(type)) {
    console.warn("Type de notification inconnu:", type);
    return;
  }

  // ✅ création en base (structure clean)
  const notif = await Notification.create({
  userId,
  type,
  isRead: false,
  data: {
    requestId: requestId || null,
    conversationId: conversationId || null
  }
});

const existing = await Notification.findOne({
  userId,
  type: "message",
  isRead: false,
  "data.conversationId": conversationId
});

if (existing) {
  // 🔁 update au lieu de recréer
  existing.updatedAt = new Date();
  await existing.save();
  return existing;
}

  // 🔔 PUSH
  const user = await User.findById(userId).select("expoPushToken");

  if (user?.expoPushToken) {
    let title = "Notification";

if (type === "message") title = "💬 Message";
if (type === "deal") title = "🤝 Proposition";
if (type === "request") title = "📢 Nouvelle demande";



    let body = "Nouvelle notification";

    if (type === "request") body = "Nouvelle demande disponible";
    if (type === "message") body = "Vous avez reçu un message";
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