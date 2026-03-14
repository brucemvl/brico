const fetch = require("node-fetch");

async function sendPushNotification(token, title, body, data = {}) {

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: token,
      sound: "default",
      title,
      body,
      data
    })
  });

}

module.exports = { sendPushNotification };