const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { authenticate, authorize, authenticateService } = require("../middleware/auth");

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product list }
 */
router.get("/", productController.getAll);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product found }
 *       404: { description: Not found }
 */
router.get("/:id", productController.getById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create product (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, stock, category]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               stock: { type: integer }
 *               category: { type: string }
 *     responses:
 *       201: { description: Product created }
 */
router.post("/", authenticate, authorize("admin"), productController.create);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product by ID (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               stock: { type: integer }
 *               category: { type: string }
 *     responses:
 *       200: { description: Product updated }
 *       404: { description: Product not found }
 */
router.put("/:id", authenticate, authorize("admin"), productController.update);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product by ID (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product deleted }
 *       404: { description: Product not found }
 */
router.delete("/:id", authenticate, authorize("admin"), productController.delete);

// Internal service-to-service endpoints (secured by service key in production)
/**
 * @swagger
 * /api/products/internal/check-stock:
 *   post:
 *     summary: Check and reserve stock (internal)
 *     tags: [Internal]
 *     security:
 *       - serviceKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: string }
 *               quantity: { type: integer }
 *     responses:
 *       200: { description: Stock reserved }
 *       409: { description: Insufficient stock }
 */
router.post("/internal/check-stock", authenticateService, productController.checkAndReserveStock);

/**
 * @swagger
 * /api/products/internal/restore-stock:
 *   post:
 *     summary: Restore stock (internal)
 *     tags: [Internal]
 *     security:
 *       - serviceKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: string }
 *               quantity: { type: integer }
 *     responses:
 *       200: { description: Stock restored }
 */
router.post("/internal/restore-stock", authenticateService, productController.restoreStock);

module.exports = router;
