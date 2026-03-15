const fetch = require("node-fetch");

/**
 * Envoie une notification push Expo à un ou plusieurs tokens
 * @param {string|string[]} token - Expo push token(s)
 * @param {string} title - Titre de la notification
 * @param {string} body - Message de la notification
 * @param {object} data - Données supplémentaires
 */
async function sendPushNotification(token, title, body, data = {}) {
  if (!token || (Array.isArray(token) && token.length === 0)) {
    console.log("⚠️ Aucun token push fourni, notification ignorée");
    return;
  }

  // S'assurer que token est toujours un tableau pour batch
  const tokens = Array.isArray(token) ? token : [token];

  const messages = tokens.map(t => ({
    to: t,
    sound: "default",
    title,
    body,
    data
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages)
    });

    const resData = await response.json();
    console.log("📩 Push response:", resData);
  } catch (err) {
    console.error("❌ Erreur push notification:", err);
  }
}

module.exports = { sendPushNotification };