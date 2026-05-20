const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, html, text = "") {
  try {
    await sgMail.send({
      to,

      from: {
        email: process.env.EMAIL_FROM,
        name: "Briconnect",
      },

      subject,

      text: text || "Notification Briconnect",

      html,
    });

    console.log("✅ Email envoyé :", to);

  } catch (error) {
    console.error(
      "❌ Erreur SendGrid:",
      error.response?.body || error.message
    );
  }
}

module.exports = sendEmail;