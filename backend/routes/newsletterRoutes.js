const express = require("express");
const Newsletter = require("../models/Newsletter");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Email invalide",
      });
    }

    await Newsletter.create({ email });

    res.status(201).json({
      success: true,
      message: "Email enregistré",
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Email déjà enregistré",
    });
  }
});

module.exports = router;