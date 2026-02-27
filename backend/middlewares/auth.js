const jwt = require("jsonwebtoken");

function auth(req, res, next) {

  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ message: "Accès refusé, token manquant" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // { id, role, iat, exp }
    next(); // important : appeler next
  } catch (err) {
    return res.status(401).json({ message: "Token invalide" });
  }
}

module.exports = auth;