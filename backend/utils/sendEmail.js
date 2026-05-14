const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, text) {
  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM,
      subject,
      text,
    });
  } catch (error) {
    console.error("Erreur SendGrid:", error.response?.body || error.message);
  }
}

module.exports = sendEmail;