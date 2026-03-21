const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const productRoutes = require("./routes/productRoutes");
const { errorHandler } = require("./middleware/errorHandler");
const { requestLogger } = require("./middleware/logger");

const app = express();
app.use(helmet());

// Parse ALLOWED_ORIGINS into array or keep as "*" or function
const allowedOrigins = process.env.ALLOWED_ORIGINS;
let corsOrigin;
if (allowedOrigins === "*") {
  corsOrigin = "*";
} else if (allowedOrigins) {
  corsOrigin = allowedOrigins.split(",").map(origin => origin.trim());
} else {
  corsOrigin = "*";
}

app.use(cors({ origin: corsOrigin, methods: ["GET","POST","PUT","DELETE"] }));
app.use(rateLimit({ windowMs: 15*60*1000, max: 200, message: { error: "Rate limit exceeded" } }));
app.use(express.json({ limit: "10kb" }));
app.use(requestLogger);

app.get("/health", (req, res) =>
  res.json({ status: "healthy", service: "product-service", timestamp: new Date().toISOString() }));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/products", productRoutes);
app.use(errorHandler);

module.exports = app;
