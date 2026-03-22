const axios = require("axios");
const jwt = require("jsonwebtoken");

const mask = (value) => {
  if (!value) return value;
  if (value.length <= 10) return "***";
  return value.slice(0, 5) + "..." + value.slice(-5);
};

const log = (...args) => {
  console.log("[AUTH]", ...args);
};

const authenticate = async (req, res, next) => {
  log("Incoming request:", {
    method: req.method,
    url: req.originalUrl,
    headers: {
      authorization: mask(req.headers.authorization),
    },
  });

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    log("❌ No or invalid Authorization header");
    return res.status(401).json({ error: "Authentication required" });
  }

  // Remote validation
  if (process.env.USER_SERVICE_URL) {
    try {
      log("🔁 Validating token via USER_SERVICE", {
        url: `${process.env.USER_SERVICE_URL}/api/auth/validate`,
      });

      const response = await axios.get(
        `${process.env.USER_SERVICE_URL}/api/auth/validate`,
        {
          headers: { Authorization: authHeader },
        }
      );

      log("✅ Token validated remotely", {
        user: response.data.user,
      });

      req.user = response.data.user;
      return next();
    } catch (err) {
      log("❌ Remote validation failed", {
        status: err.response?.status,
        message: err.response?.data || err.message,
      });

      return res.status(401).json({ error: "Invalid token" });
    }
  }

  // Local fallback
  if (process.env.NODE_ENV !== "development") {
    log("❌ No USER_SERVICE_URL in non-dev environment");
    return res
      .status(401)
      .json({ error: "Authentication service unavailable" });
  }

  try {
    const token = authHeader.split(" ")[1];

    log("🔐 Verifying JWT locally", {
      token: mask(token),
    });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    log("✅ JWT verified locally", {
      user: decoded,
    });

    req.user = decoded;
    next();
  } catch (err) {
    log("❌ JWT verification failed", {
      message: err.message,
    });

    res.status(401).json({ error: "Invalid token" });
  }
};

const authorize = (...roles) => (req, res, next) => {
  log("🔎 Authorizing user", {
    user: req.user,
    requiredRoles: roles,
  });

  if (!req.user || !roles.includes(req.user.role)) {
    log("❌ Authorization failed");
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  log("✅ Authorization success");
  next();
};

const authenticateService = (req, res, next) => {
  const serviceKey =
    req.headers["x-service-key"] || req.headers["x-internal-key"];

  log("🔑 Service authentication attempt", {
    providedKey: mask(serviceKey),
  });

  if (!serviceKey || serviceKey !== process.env.INTERNAL_SERVICE_KEY) {
    log("❌ Invalid service key");
    return res.status(403).json({ error: "Invalid service key" });
  }

  log("✅ Service authenticated");
  next();
};

module.exports = { authenticate, authorize, authenticateService };