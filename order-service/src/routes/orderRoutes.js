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

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders (admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Orders list }
 *       403: { description: Insufficient permissions }
 */
router.get("/", authenticate, authorize("admin"), orderController.getAllOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by id
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200: { description: Order details }
 *       403: { description: Access denied }
 *       404: { description: Order not found }
 */
router.get("/:id", authenticate, orderController.getOrderById);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   put:
 *     summary: Cancel an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200: { description: Order cancelled }
 *       400: { description: Cannot cancel order in current status }
 *       403: { description: Access denied }
 *       404: { description: Order not found }
 */
router.put("/:id/cancel", authenticate, orderController.cancelOrder);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, processing, shipped, delivered, cancelled]
 *     responses:
 *       200: { description: Order status updated }
 *       400: { description: Invalid status }
 *       403: { description: Insufficient permissions }
 *       404: { description: Order not found }
 */
router.put(
  "/:id/status",
  authenticate,
  authorize("admin"),
  orderController.updateOrderStatus,
);

// Internal endpoint called by Payment Service
/**
 * @swagger
 * /api/orders/internal/confirm-payment:
 *   post:
 *     summary: Confirm payment for an order (internal)
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, paymentId]
 *             properties:
 *               orderId:
 *                 type: string
 *               paymentId:
 *                 type: string
 *     responses:
 *       200: { description: Payment confirmation applied }
 *       404: { description: Order not found }
 */
router.post("/internal/confirm-payment", orderController.confirmPayment);

module.exports = router;
