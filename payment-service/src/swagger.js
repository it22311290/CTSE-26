const swaggerJsdoc = require("swagger-jsdoc");
module.exports = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "Payment Service API", version: "1.0.0", description: "Payment processing and history" },
    servers: [{ url: process.env.BASE_URL || "http://localhost:3004" }],
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } }
  },
  apis: ["./src/routes/*.js"]
});
