
async function sendPushNotification(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return;

  const messages = tokens.map(token => ({
    to: token,
    sound: "default",
    title,
    body,
    data
  }));

  console.log("SENDING PUSH TO:", tokens);
console.log("MESSAGES:", messages);

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages)
    });
  } catch (err) {
    console.error("Erreur envoi push:", err);
  }
}

module.exports = sendPushNotification;