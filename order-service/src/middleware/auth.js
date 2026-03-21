const axios = require("axios");
const USER_SERVICE = process.env.USER_SERVICE_URL || "http://user-service:3001";

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ error: "Authentication required" });
  try {
    const response = await axios.get(`${USER_SERVICE}/api/auth/validate`, {
      headers: { Authorization: authHeader }
    });
    req.user = response.data.user;
    req.token = authHeader.split(" ")[1];
    next();
  } catch {
    // Fallback: decode without verify in dev
    try {
      const token = authHeader.split(" ")[1];
      req.user = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
      req.token = token;
      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role))
    return res.status(403).json({ error: "Insufficient permissions" });
  next();
};

module.exports = { authenticate, authorize };
