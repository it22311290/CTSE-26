const request = require("supertest");
const app = require("../src/app");

describe("Auth Endpoints", () => {
  let authToken;

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Test User", email: "test@example.com", password: "password123"
      });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });

    it("should reject duplicate email", async () => {
      await request(app).post("/api/auth/register").send({
        name: "User2", email: "dup@example.com", password: "password123"
      });
      const res = await request(app).post("/api/auth/register").send({
        name: "User3", email: "dup@example.com", password: "password456"
      });
      expect(res.statusCode).toBe(409);
    });

    it("should reject short password", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "User", email: "short@example.com", password: "123"
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully", async () => {
      await request(app).post("/api/auth/register").send({
        name: "Login User", email: "login@example.com", password: "password123"
      });
      const res = await request(app).post("/api/auth/login").send({
        email: "login@example.com", password: "password123"
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
      authToken = res.body.token;
    });

    it("should reject wrong password", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "login@example.com", password: "wrongpassword"
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/auth/validate", () => {
    it("should validate a valid token", async () => {
      const reg = await request(app).post("/api/auth/register").send({
        name: "Val User", email: "val@example.com", password: "password123"
      });
      const res = await request(app).get("/api/auth/validate")
        .set("Authorization", `Bearer ${reg.body.token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.valid).toBe(true);
    });

    it("should reject invalid token", async () => {
      const res = await request(app).get("/api/auth/validate")
        .set("Authorization", "Bearer invalidtoken123");
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const res = await request(app).get("/health");
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.service).toBe("user-service");
    });
  });
});
