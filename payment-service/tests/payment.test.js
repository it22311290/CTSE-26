const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");


jest.mock("../src/middleware/auth", () => ({
  authenticate: (req, res, next) => {
    // Simulate a logged-in user
    req.user = { userId: "test-user-123", email: "test@test.com", role: "customer" };
    next();
  },
  authorize: () => (req, res, next) => {
    // Simulate admin authorization passing
    next();
  }
}));

//import the app and models
const app = require("../src/app");
const { Payment, PaymentStatus } = require("../src/models/paymentModel");

let mongod;

// IN-MEMORY DATABASE SETUP
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  // Clear the database after each test so they don't interfere with each other
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

// THE ACTUAL TESTS
describe("Payment Endpoints", () => {
  
  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const res = await request(app).get("/health");
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.service).toBe("payment-service");
    });
  });

  describe("POST /api/payments/initiate", () => {
    it("should initiate a payment successfully", async () => {
      const res = await request(app).post("/api/payments/initiate").send({
        orderId: "ORD-999",
        amount: 150.50,
        userId: "test-user-123"
      });
      
      expect(res.statusCode).toBe(202);
      expect(res.body).toHaveProperty("message", "Payment initiated");
      expect(res.body).toHaveProperty("paymentId");
      expect(res.body.status).toBe(PaymentStatus.PROCESSING);
    });

    it("should reject if required fields are missing", async () => {
      const res = await request(app).post("/api/payments/initiate").send({
        amount: 150.50
        // Missing orderId and userId
      });
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 409 if order is already paid", async () => {
      // Manually create a completed payment first
      await Payment.create({
        orderId: "ORD-555",
        userId: "test-user-123",
        amount: 100,
        status: PaymentStatus.COMPLETED
      });

      // Try to pay for the same order again
      const res = await request(app).post("/api/payments/initiate").send({
        orderId: "ORD-555",
        amount: 100,
        userId: "test-user-123"
      });
      
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe("Order already paid");
    });
  });

  describe("GET /api/payments/my", () => {
    it("should return only the authenticated user's payments", async () => {
      // Create one payment for our mock user, and one for someone else
      await Payment.create({ orderId: "1", userId: "test-user-123", amount: 50 });
      await Payment.create({ orderId: "2", userId: "different-user", amount: 75 });

      const res = await request(app).get("/api/payments/my");
      
      expect(res.statusCode).toBe(200);
      expect(res.body.payments).toHaveLength(1);
      expect(res.body.payments[0].userId).toBe("test-user-123");
    });
  });

});