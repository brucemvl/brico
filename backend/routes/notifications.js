const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const Notification = require("../models/Notification");
const User = require("../models/User");

// 🔹 GET mes notifications
router.get("/", auth, async (req, res) => {
  console.log("GET /notifications appelé");
  try {
    const notifications = await Notification.find({
      userId: req.user.id
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 COUNT non lues (badge)
router.get("/unread-count", auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 mark all read
router.post("/mark-all-read", auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 mark one read
router.post("/:id/read", auth, async (req, res) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, userId: req.user.id },
      { $set: { isRead: true } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//ACTIVER OU DESACTIVER NOTIFS
router.put("/me/notifications", auth, async (req, res) => {
  try {
    const updates = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { notificationPreferences: updates },
      { new: true }
    );

    res.json(user.notificationPreferences);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;