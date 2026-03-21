const axios = require("axios");
const jwt = require("jsonwebtoken");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ error: "Authentication required" });

  // If USER_SERVICE_URL set, validate token remotely; else validate locally
  if (process.env.USER_SERVICE_URL) {
    try {
      const response = await axios.get(`${process.env.USER_SERVICE_URL}/api/auth/validate`, {
        headers: { Authorization: authHeader }
      });
      req.user = response.data.user;
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  // Fallback: verify JWT with shared secret (only in development)
  if (process.env.NODE_ENV !== 'development') {
    return res.status(401).json({ error: "Authentication service unavailable" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
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
