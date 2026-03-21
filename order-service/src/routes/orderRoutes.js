const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticate, authorize } = require("../middleware/auth");

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, shippingAddress]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: integer, minimum: 1 }
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   street: { type: string }
 *                   city: { type: string }
 *                   country: { type: string }
 *     responses:
 *       201: { description: Order created }
 *       409: { description: Insufficient stock }
 */
router.post("/", authenticate, orderController.createOrder);

/**
 * @swagger
 * /api/orders/my:
 *   get:
 *     summary: Get current user orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Orders list }
 */
router.get("/my", authenticate, orderController.getMyOrders);

router.get("/", authenticate, authorize("admin"), orderController.getAllOrders);
router.get("/:id", authenticate, orderController.getOrderById);
router.put("/:id/cancel", authenticate, orderController.cancelOrder);
router.put("/:id/status", authenticate, authorize("admin"), orderController.updateOrderStatus);

// Internal endpoint called by Payment Service
router.post("/internal/confirm-payment", orderController.confirmPayment);

module.exports = router;
