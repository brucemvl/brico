const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "pros",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "heic"],
    transformation: [
      { width: 1200, crop: "limit" }, // limite taille auto
      { quality: "auto" }
    ]
  }
});

// Limite à 10 Mo par fichier (tu peux ajuster)
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 Mo
  }
});

const uploadImages = (req, res, next) => {
  upload.array("images")(req, res, (err) => {

    if (err) {
      console.error("❌ Erreur upload :", err);

      // Client qui abandonne la requête
      if (err.message === "Request aborted") {
        console.warn("⚠️ Upload abandonné par le client");
        return;
      }

      // Fichier trop gros
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: "Une image dépasse la taille maximale de 10 Mo."
          });
        }

        return res.status(400).json({
          error: err.message
        });
      }

      return res.status(500).json({
        error: "Erreur lors de l'envoi des images"
      });
    }

    next();
  });
};

module.exports = {
  upload,
  uploadImages
};