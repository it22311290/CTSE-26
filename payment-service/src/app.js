const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const paymentRoutes = require("./routes/paymentRoutes");
const { errorHandler } = require("./middleware/errorHandler");
const { requestLogger } = require("./middleware/logger");

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || "*" }));
app.use(rateLimit({ windowMs: 15*60*1000, max: 50, message: { error: "Rate limit exceeded" } }));
app.use(express.json({ limit: "10kb" }));
app.use(requestLogger);

app.get("/health", (req, res) =>
  res.json({ status: "healthy", service: "payment-service", timestamp: new Date().toISOString() }));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/payments", paymentRoutes);
app.use(errorHandler);

module.exports = app;
