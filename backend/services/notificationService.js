const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendPushNotification } = require("./pushService");

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

  // 🔔 PUSH
  const user = await User.findById(userId);

  if (user?.expoPushToken) {
    let body = "Nouvelle notification";

    if (type === "request") body = "Nouvelle demande disponible";
    if (type === "message") body = "Vous avez reçu un message";
    if (type === "deal") body = "Nouvelle proposition";
    if (type === "review") body = "Nouvel avis reçu";

    await sendPushNotification(
      user.expoPushToken,
      "Notification",
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