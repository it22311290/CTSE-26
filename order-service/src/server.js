const app = require("./app");
const PORT = process.env.PORT || 3003;
const server = app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
  console.log(`API Docs: http://localhost:${PORT}/api-docs`);
});
process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
module.exports = server;
