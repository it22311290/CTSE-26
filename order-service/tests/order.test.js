const request = require("supertest");
const app = require("../src/app");

describe("Order Service Health", () => {
  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const res = await request(app).get("/health");
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.service).toBe("order-service");
    });
  });

  describe("POST /api/orders/internal/confirm-payment", () => {
    it("should handle payment confirmation gracefully", async () => {
      const res = await request(app).post("/api/orders/internal/confirm-payment")
        .send({ orderId: "ORD-00001", paymentId: "PAY-00001" });
      // Returns 404 since order doesn't exist in test, which is expected
      expect([200, 404]).toContain(res.statusCode);
    });
  });
});
