const axios = require("axios");
const USER_SERVICE = process.env.USER_SERVICE_URL || "http://user-service:3001";

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ error: "Authentication required" });
  try {
    const response = await axios.get(`${USER_SERVICE}/api/auth/validate`, { headers: { Authorization: authHeader } });
    req.user = response.data.user;
    req.token = authHeader.split(" ")[1];
    next();
  } catch {
    try {
      req.user = JSON.parse(Buffer.from(authHeader.split(" ")[1].split(".")[1], "base64").toString());
      req.token = authHeader.split(" ")[1];
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

const authenticateService = (req, res, next) => {
  const serviceKey = req.headers['x-service-key'] || req.headers['x-internal-key'];
  if (!serviceKey || serviceKey !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({ error: "Invalid service key" });
  }
  next();
};

module.exports = { authenticate, authorize, authenticateService };
