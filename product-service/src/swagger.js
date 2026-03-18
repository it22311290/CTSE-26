const swaggerJsdoc = require("swagger-jsdoc");
module.exports = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "Product Service API", version: "1.0.0", description: "Product catalog and inventory management" },
    servers: [{ url: process.env.BASE_URL || "http://localhost:3002" }],
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } }
  },
  apis: ["./src/routes/*.js"]
});
