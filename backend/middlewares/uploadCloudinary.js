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

module.exports = upload;