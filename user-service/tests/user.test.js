const request = require("supertest");
const app = require("../src/app");

describe("User Endpoints", () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create and login a user to get auth token for protected user routes
    const register = await request(app).post("/api/auth/register").send({
      name: "UserRoute Test",
      email: "userroute@example.com",
      password: "password123",
    });
    expect(register.statusCode).toBe(201);

    const login = await request(app).post("/api/auth/login").send({
      email: "userroute@example.com",
      password: "password123",
    });
    expect(login.statusCode).toBe(200);
    authToken = login.body.token;
    userId = login.body.user?.id || register.body.user?.id;
  });

  describe("GET /api/users", () => {
    it("should return a list of users", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/users/:id", () => {
    it("should return the user by id", async () => {
      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("id", userId);
      expect(res.body).toHaveProperty("email", "userroute@example.com");
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("should return 404 for nonexistent id", async () => {
      const res = await request(app)
        .get("/api/users/000000000000000000000000")
        .set("Authorization", `Bearer ${authToken}`);

      expect([404, 400]).toContain(res.statusCode);
    });
  });

  describe("PUT /api/users/:id", () => {
    it("should update the user profile", async () => {
      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Updated Name" });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("name", "Updated Name");
    });

    it("should reject invalid update payload", async () => {
      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ email: "invalid-email" });

      expect([400, 422]).toContain(res.statusCode);
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("should delete the user", async () => {
      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect([200, 204]).toContain(res.statusCode);
    });

    it("should return 404 for already deleted user", async () => {
      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect([404, 400]).toContain(res.statusCode);
    });
  });
});