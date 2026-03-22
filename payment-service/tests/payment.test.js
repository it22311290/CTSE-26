const request = require("supertest");
const mongoose = require("mongoose");

// Mock axios BEFORE app is required so the auth middleware's user-service call

jest.mock("axios", () => ({
  get: jest.fn().mockRejectedValue(new Error("user-service unavailable")),
  post: jest.fn().mockRejectedValue(new Error("order-service unavailable")),
}));

const app = require("../src/app");
const { Payment, PaymentStatus } = require("../src/models/paymentModel");

// ─── Helpers ────────────────────────────────────────────────────────────────

// Auth middleware falls back to base64-decoding the JWT payload when the
// user-service is unreachable. We craft a structurally valid JWT with a
// hand-rolled base64 payload — no jsonwebtoken package needed.
const makeUserToken = (userId, role = "user") => {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ userId, role })).toString(
    "base64url",
  );
  return `${header}.${payload}.fakesignature`;
};

const USER_ID = new mongoose.Types.ObjectId().toString();
const ADMIN_ID = new mongoose.Types.ObjectId().toString();
const ORDER_ID = new mongoose.Types.ObjectId().toString();

let userToken;
let adminToken;

// ─── Suite ──────────────────────────────────────────────────────────────────

describe("Payment Endpoints", () => {
  beforeAll(() => {
    userToken = makeUserToken(USER_ID, "user");
    adminToken = makeUserToken(ADMIN_ID, "admin");
  });

  afterEach(async () => {
    await Payment.deleteMany({});
  });

  // ── POST /api/payments/initiate ──────────────────────────────────────────

  describe("POST /api/payments/initiate", () => {
    const SERVICE_KEY = "test-service-key";

    it("should initiate a payment and return 202", async () => {
      const res = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", `Bearer ${userToken}`)
        .set("x-service-key", SERVICE_KEY)
        .send({ orderId: ORDER_ID, userId: USER_ID, amount: 99.99 });

      expect(res.statusCode).toBe(202);
      expect(res.body).toHaveProperty("paymentId");
      expect(res.body).toHaveProperty("transactionRef");
      expect(res.body.status).toBe(PaymentStatus.PROCESSING);
      expect(res.body.message).toBe("Payment initiated");
    });

    it("should accept an explicit payment method", async () => {
      const res = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", `Bearer ${userToken}`)
        .set("x-service-key", SERVICE_KEY)
        .send({
          orderId: ORDER_ID,
          userId: USER_ID,
          amount: 50,
          method: "paypal",
        });

      expect(res.statusCode).toBe(202);
    });

    it("should reject a request missing orderId", async () => {
      const res = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", `Bearer ${userToken}`)
        .set("x-service-key", SERVICE_KEY)
        .send({ userId: USER_ID, amount: 99.99 });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should reject a request missing amount", async () => {
      const res = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", `Bearer ${userToken}`)
        .set("x-service-key", SERVICE_KEY)
        .send({ orderId: ORDER_ID, userId: USER_ID });

      expect(res.statusCode).toBe(400);
    });

    it("should reject a request missing userId", async () => {
      const res = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", `Bearer ${userToken}`)
        .set("x-service-key", SERVICE_KEY)
        .send({ orderId: ORDER_ID, amount: 99.99 });

      expect(res.statusCode).toBe(400);
    });

    it("should reject a zero or negative amount", async () => {
      const res = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", `Bearer ${userToken}`)
        .set("x-service-key", SERVICE_KEY)
        .send({ orderId: ORDER_ID, userId: USER_ID, amount: -5 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/positive/i);
    });

    it("should return 409 when order is already paid", async () => {
      await Payment.create({
        orderId: ORDER_ID,
        userId: USER_ID,
        amount: 99.99,
        status: PaymentStatus.COMPLETED,
      });

      const res = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", `Bearer ${userToken}`)
        .set("x-service-key", SERVICE_KEY)
        .send({ orderId: ORDER_ID, userId: USER_ID, amount: 99.99 });

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toMatch(/already paid/i);
      expect(res.body).toHaveProperty("payment");
    });

    it("should reject a request with invalid service key", async () => {
      const res = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", `Bearer ${userToken}`)
        .set("x-service-key", "wrong-key")
        .send({ orderId: ORDER_ID, userId: USER_ID, amount: 99.99 });

      expect(res.statusCode).toBe(403);
    });

    it("should reject an unauthenticated request (no bearer token)", async () => {
      const res = await request(app)
        .post("/api/payments/initiate")
        .set("x-service-key", SERVICE_KEY)
        .send({ orderId: ORDER_ID, userId: USER_ID, amount: 99.99 });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /api/payments/my ─────────────────────────────────────────────────

  describe("GET /api/payments/my", () => {
    it("should return only the authenticated user's payments", async () => {
      const OTHER_USER = new mongoose.Types.ObjectId().toString();

      await Payment.create({ orderId: ORDER_ID, userId: USER_ID, amount: 10 });
      await Payment.create({
        orderId: ORDER_ID,
        userId: OTHER_USER,
        amount: 20,
      });

      const res = await request(app)
        .get("/api/payments/my")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("payments");
      expect(res.body).toHaveProperty("count");
      expect(res.body.count).toBe(1);
      res.body.payments.forEach((p) => expect(p.userId).toBe(USER_ID));
    });

    it("should return an empty array when the user has no payments", async () => {
      const res = await request(app)
        .get("/api/payments/my")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.payments).toHaveLength(0);
      expect(res.body.count).toBe(0);
    });

    it("should reject an unauthenticated request", async () => {
      const res = await request(app).get("/api/payments/my");
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /api/payments (admin) ────────────────────────────────────────────

  describe("GET /api/payments", () => {
    it("should return all payments for an admin", async () => {
      await Payment.create({ orderId: ORDER_ID, userId: USER_ID, amount: 10 });
      await Payment.create({ orderId: ORDER_ID, userId: ADMIN_ID, amount: 20 });

      const res = await request(app)
        .get("/api/payments")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.payments).toHaveLength(2);
    });

    it("should deny access to a regular user", async () => {
      const res = await request(app)
        .get("/api/payments")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it("should reject an unauthenticated request", async () => {
      const res = await request(app).get("/api/payments");
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /api/payments/order/:orderId ─────────────────────────────────────

  describe("GET /api/payments/order/:orderId", () => {
    it("should return all payments for a given orderId", async () => {
      const OTHER_ORDER = new mongoose.Types.ObjectId().toString();

      await Payment.create({ orderId: ORDER_ID, userId: USER_ID, amount: 10 });
      await Payment.create({
        orderId: OTHER_ORDER,
        userId: USER_ID,
        amount: 20,
      });

      const res = await request(app)
        .get(`/api/payments/order/${ORDER_ID}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.payments).toHaveLength(1);
      expect(res.body.payments[0].orderId).toBe(ORDER_ID);
    });

    it("should return an empty array for an order with no payments", async () => {
      const res = await request(app)
        .get(`/api/payments/order/${ORDER_ID}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.payments).toHaveLength(0);
    });

    it("should reject an unauthenticated request", async () => {
      const res = await request(app).get(`/api/payments/order/${ORDER_ID}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /api/payments/:id ────────────────────────────────────────────────

  describe("GET /api/payments/:id", () => {
    it("should return the payment for the owning user", async () => {
      const payment = await Payment.create({
        orderId: ORDER_ID,
        userId: USER_ID,
        amount: 49.99,
      });

      const res = await request(app)
        .get(`/api/payments/${payment._id}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.payment).toHaveProperty("id");
      expect(res.body.payment.userId).toBe(USER_ID);
    });

    it("should allow an admin to view any payment", async () => {
      const payment = await Payment.create({
        orderId: ORDER_ID,
        userId: USER_ID,
        amount: 49.99,
      });

      const res = await request(app)
        .get(`/api/payments/${payment._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    it("should return 403 when a user requests another user's payment", async () => {
      const OTHER_USER = new mongoose.Types.ObjectId().toString();
      const otherToken = makeUserToken(OTHER_USER, "user");
      const payment = await Payment.create({
        orderId: ORDER_ID,
        userId: USER_ID,
        amount: 49.99,
      });

      const res = await request(app)
        .get(`/api/payments/${payment._id}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(res.statusCode).toBe(403);
    });

    it("should return 404 for a non-existent payment ID", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/payments/${fakeId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(404);
    });

    it("should return 404 for an invalid ObjectId", async () => {
      const res = await request(app)
        .get("/api/payments/not-a-valid-id")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(404);
    });

    it("should reject an unauthenticated request", async () => {
      const payment = await Payment.create({
        orderId: ORDER_ID,
        userId: USER_ID,
        amount: 49.99,
      });

      const res = await request(app).get(`/api/payments/${payment._id}`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /api/payments/:id/refund ────────────────────────────────────────

  describe("POST /api/payments/:id/refund", () => {
    it("should refund a completed payment (admin)", async () => {
      const payment = await Payment.create({
        orderId: ORDER_ID,
        userId: USER_ID,
        amount: 99.99,
        status: PaymentStatus.COMPLETED,
      });

      const res = await request(app)
        .post(`/api/payments/${payment._id}/refund`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.payment.status).toBe(PaymentStatus.REFUNDED);
      expect(res.body.message).toMatch(/refunded/i);
    });

    it("should return 400 when trying to refund a pending payment", async () => {
      const payment = await Payment.create({
        orderId: ORDER_ID,
        userId: USER_ID,
        amount: 99.99,
        status: PaymentStatus.PENDING,
      });

      const res = await request(app)
        .post(`/api/payments/${payment._id}/refund`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/cannot refund/i);
    });

    it("should return 400 when trying to refund a failed payment", async () => {
      const payment = await Payment.create({
        orderId: ORDER_ID,
        userId: USER_ID,
        amount: 99.99,
        status: PaymentStatus.FAILED,
      });

      const res = await request(app)
        .post(`/api/payments/${payment._id}/refund`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
    });

    it("should return 400 when trying to refund an already-refunded payment", async () => {
      const payment = await Payment.create({
        orderId: ORDER_ID,
        userId: USER_ID,
        amount: 99.99,
        status: PaymentStatus.REFUNDED,
      });

      const res = await request(app)
        .post(`/api/payments/${payment._id}/refund`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
    });

    it("should deny refund to a regular user", async () => {
      const payment = await Payment.create({
        orderId: ORDER_ID,
        userId: USER_ID,
        amount: 99.99,
        status: PaymentStatus.COMPLETED,
      });

      const res = await request(app)
        .post(`/api/payments/${payment._id}/refund`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it("should return 404 for a non-existent payment", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/payments/${fakeId}/refund`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });

    it("should return 404 for an invalid ObjectId", async () => {
      const res = await request(app)
        .post("/api/payments/not-valid/refund")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });

    it("should reject an unauthenticated request", async () => {
      const payment = await Payment.create({
        orderId: ORDER_ID,
        userId: USER_ID,
        amount: 99.99,
        status: PaymentStatus.COMPLETED,
      });

      const res = await request(app).post(
        `/api/payments/${payment._id}/refund`,
      );
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /health ──────────────────────────────────────────────────────────

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const res = await request(app).get("/health");

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.service).toBe("payment-service");
    });
  });
});
