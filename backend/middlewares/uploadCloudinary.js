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
    fileSize: 10 * 1024 * 1024
  }
});

const uploadImages = (req, res, next) => {
  upload.array("images", 5)(req, res, (err) => {

    if (err) {
      console.error("❌ ERREUR MULTER :", err);

      if (err.message === "Request aborted") {
        console.warn("⚠️ Upload interrompu par le client");
        return;
      }

      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: "Image trop volumineuse. Maximum 10 Mo."
          });
        }

        return res.status(400).json({
          error: err.message
        });
      }

      return res.status(500).json({
        error: "Erreur pendant l'upload"
      });
    }

    next();
  });
};

module.exports = upload;
module.exports.uploadImages = uploadImages;