require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const usersRouter = require("./routes/users");
const conversationRoutes = require("./routes/conversations");
const notificationRoutes = require("./routes/notifications");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log(err));

  

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/requests", require("./routes/requestRoutes"));
app.use("/api/users", usersRouter);
app.use("/uploads", express.static("uploads"));
app.use("/api/conversations", conversationRoutes);
app.use("/api/notifications", notificationRoutes);

// 🔥 Gestion erreurs Multer
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "Fichier trop volumineux (max 10 Mo)"
    });
  }

  if (err.name === "MulterError") {
    return res.status(400).json({
      error: err.message
    });
  }

  console.error(err);
  res.status(500).json({ error: "Erreur serveur" });
});

app.get('/download', (req, res) => {
  const userAgent = req.headers['user-agent'] || '';

  // 📱 Android
  if (/android/i.test(userAgent)) {
    return res.redirect(
      'https://play.google.com/store/apps/details?id=com.onzesur10.app'
    );
  }

  //  iOS
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return res.redirect(
      'https://apps.apple.com/fr/app/briconnect/id6761682000'
    );
  }

  // 💻 Fallback (PC, autres)
  return res.redirect('https://apps.apple.com/fr/app/briconnect/id6761682000');
});

// Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);