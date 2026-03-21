const app = require("./app");
const connectDB = require("./db");

const PORT = process.env.PORT || 3004;

const start = async () => {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`Payment Service running on port ${PORT}`);
    console.log(`API Docs: http://localhost:${PORT}/api-docs`);
  });
  const shutdown = () => server.close(() => { console.log("Payment Service stopped"); process.exit(0); });
  process.on("SIGTERM", shutdown);
  process.on("SIGINT",  shutdown);
};

start().catch(err => { console.error("Failed to start:", err); process.exit(1); });
