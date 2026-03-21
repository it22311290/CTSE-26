const request = require("supertest");
const app = require("../src/app");

describe("Payment Service Health", () => {
  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const res = await request(app).get("/health");
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.service).toBe("payment-service");
    });
  });
});
