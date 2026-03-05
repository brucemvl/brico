const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");

const Conversation = require("../models/Conversation");
const Request = require("../models/Request");


// ==============================
// 1️⃣ DEMARRER UNE CONVERSATION
// ==============================

router.post("/start", auth, async (req, res) => {
  try {

    const { requestId } = req.body;

    const request = await Request.findById(requestId);

    if (!request)
      return res.status(404).json({ error: "Demande introuvable" });

    // vérifier si conversation existe déjà
    let conversation = await Conversation.findOne({
      request: requestId,
      pro: req.user.id
    });

    if (!conversation) {

      conversation = new Conversation({
        request: requestId,
        client: request.client,
        pro: req.user.id,
        messages: []
      });

      await conversation.save();
    }

    res.json(conversation);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



// ==============================
// 2️⃣ RECUPERER UNE CONVERSATION
// ==============================

router.get("/:requestId", auth, async (req, res) => {
  try {

    const conversation = await Conversation.findOne({
  request: req.params.requestId,
  $or: [{ client: req.user.id }, { pro: req.user.id }]
})
.populate("client", "name profileImage")
.populate("pro", "name profileImage")
.populate({ path: "messages.from", select: "name profileImage", strictPopulate: false });

    if (!conversation)
      return res.status(404).json({ error: "Conversation introuvable" });

    conversation.messages.forEach(msg => {

  if (!msg.readBy.includes(req.user.id)) {
    msg.readBy.push(req.user.id);
  }

});

await conversation.save();

    res.json(conversation);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ==============================
// 3️⃣ ENVOYER MESSAGE
// ==============================

router.post("/:id/message", auth, async (req, res) => {

  try {

    const { content } = req.body;

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation)
      return res.status(404).json({ error: "Conversation introuvable" });

    conversation.messages.push({
  from: req.user.id,
  content,
  readBy: [req.user.id] // celui qui envoie a déjà lu
});

    await conversation.save();

await conversation.populate("messages.from", "name profileImage");


    res.json(conversation);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }

});

// ==============================
// 4️⃣ COMPTER MESSAGES NON LUS
// ==============================

router.get("/unread/count", auth, async (req, res) => {

  try {

    const conversations = await Conversation.find({
      $or: [
        { client: req.user.id },
        { pro: req.user.id }
      ]
    });

    let unreadCount = 0;

    conversations.forEach(conv => {

      conv.messages.forEach(msg => {

        if (
          msg.from.toString() !== req.user.id &&
          !msg.readBy.includes(req.user.id)
        ) {
          unreadCount++;
        }

      });

    });

    res.json({ unread: unreadCount });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }

});



module.exports = router;