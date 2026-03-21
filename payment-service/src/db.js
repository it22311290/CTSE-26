const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is not set");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 });
  console.log(`[payment-service] MongoDB connected: ${mongoose.connection.host}`);
};

mongoose.connection.on("disconnected", () => console.warn("[payment-service] MongoDB disconnected"));
mongoose.connection.on("error", (err) => console.error("[payment-service] MongoDB error:", err));

module.exports = connectDB;
