const multer = require("multer");
 const { CloudinaryStorage } = require("multer-storage-cloudinary");
  const cloudinary = require("../config/cloudinary");
   const storage = new CloudinaryStorage({
     cloudinary, params: {
         folder: "requests",
          allowed_formats: ["jpg", "jpeg", "png", "webp", "heic"],
           transformation: [ { width: 1600, crop: "limit" },
             { quality: "auto" } ] } });
             
             module.exports = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });