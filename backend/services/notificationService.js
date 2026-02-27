const User = require("../models/User");

const createNotification = async ({
  userId,
  type,
  content,
  relatedRequest = null
}) => {
  try {
    await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          notifications: {
            type,
            content,
            relatedRequest
          }
        }
      },
      { new: true }
    );
  } catch (err) {
    console.error("Erreur notification:", err.message);
  }
};

module.exports = {
  createNotification
};