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
    it("should return 403 for non-admin user", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /api/users/:id", () => {
    it("should return the user by id", async () => {
      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty("email", "userroute@example.com");
      expect(res.body.user).not.toHaveProperty("passwordHash");
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
        .put("/api/users/me")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Updated Name" });

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty("name", "Updated Name");
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("should return 403 for non-admin user", async () => {
      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
