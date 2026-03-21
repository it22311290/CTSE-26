const swaggerJsdoc = require("swagger-jsdoc");
module.exports = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "Order Service API", version: "1.0.0", description: "Order management with product stock integration" },
    servers: [{ url: process.env.BASE_URL || "http://localhost:3003" }],
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } }
  },
  apis: ["./src/routes/*.js"]
});
