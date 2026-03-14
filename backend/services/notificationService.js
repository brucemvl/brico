const User = require("../models/User");
const { sendPushNotification } = require("./pushService");

async function createNotification({ userId, type, request, conversation }) {

  const user = await User.findById(userId);

  if (!user) return;

  const notification = {
    type,
    request,
    conversation,
    read: false
  };

  user.notifications.push(notification);
  await user.save();

  // 🔔 PUSH NOTIFICATION
  if (user.expoPushToken) {

    let title = "Nouvelle notification";
    let body = "";

    if (type === "new_request") body = "Nouvelle demande disponible";
    if (type === "new_message") body = "Vous avez reçu un message";
    if (type === "new_offer") body = "Un pro a envoyé une offre";

    await sendPushNotification(
      user.expoPushToken,
      title,
      body,
      { request }
    );
  }
}

module.exports = { createNotification };