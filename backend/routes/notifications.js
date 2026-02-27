const router = require("express").Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// JWT Middleware
const auth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Non autorisé" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token invalide" });
  }
};

// ================= GET ALL =================
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("notifications");

    res.json(user.notifications.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    ));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= COUNT UNREAD =================
router.get("/unread-count", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const count = user.notifications.filter(n => !n.read).length;

    res.json({ unread: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= MARK AS READ =================
router.patch("/:notifId/read", auth, async (req, res) => {
  try {
    await User.updateOne(
      {
        _id: req.user.id,
        "notifications._id": req.params.notifId
      },
      {
        $set: { "notifications.$.read": true }
      }
    );

    res.json({ message: "Notification marquée comme lue" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE NOTIFICATION =================
router.delete("/:notifId", auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { notifications: { _id: req.params.notifId } }
    });

    res.json({ message: "Notification supprimée" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;