require('dotenv').config();

const app = require("./app");
const { connectDB, disconnectDB } = require("./db");
// const { seed } = require("./models/productModel");

const PORT = process.env.PORT || 3002;

const start = async () => {
  await connectDB();
  // await seed();
  const server = app.listen(PORT, () => {
    console.log(`Product Service running on port ${PORT}`);
    console.log(`API Docs: http://localhost:${PORT}/api-docs`);
  });
  const shutdown = async () => {
    console.log("Shutting down gracefully...");
    server.close(async () => {
      await disconnectDB();
      console.log("Product Service stopped");
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT",  shutdown);
};

start().catch(err => { console.error("Failed to start:", err); process.exit(1); });
