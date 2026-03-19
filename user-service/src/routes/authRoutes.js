
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               role: { type: string, enum: [customer, admin] }
 *     responses:
 *       201: { description: User registered }
 *       400: { description: Validation error }
 *       409: { description: Email exists }
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /api/auth/validate:
 *   get:
 *     summary: Validate JWT token (used by other microservices)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Token valid }
 *       401: { description: Token invalid }
 */
router.get("/validate", authController.validate);

module.exports = router;
