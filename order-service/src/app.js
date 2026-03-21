const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const orderRoutes = require("./routes/orderRoutes");
const { errorHandler } = require("./middleware/errorHandler");
const { requestLogger } = require("./middleware/logger");

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || "*" }));
app.use(rateLimit({ windowMs: 15*60*1000, max: 150 }));
app.use(express.json({ limit: "10kb" }));
app.use(requestLogger);

app.get("/health", (req, res) =>
  res.json({ status: "healthy", service: "order-service", timestamp: new Date().toISOString() }));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/orders", orderRoutes);
app.use(errorHandler);

module.exports = app;
