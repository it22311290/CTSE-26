const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { authenticate, authorize } = require("../middleware/auth");

/**
 * @swagger
 * /api/payments/initiate:
 *   post:
 *     summary: Initiate payment for an order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, amount, userId]
 *             properties:
 *               orderId: { type: string }
 *               amount: { type: number }
 *               userId: { type: string }
 *               method: { type: string, enum: [card, paypal, bank_transfer] }
 *     responses:
 *       202: { description: Payment initiated }
 *       409: { description: Already paid }
 */
router.post("/initiate", authenticate, paymentController.initiatePayment);

/**
 * @swagger
 * /api/payments/my:
 *   get:
 *     summary: Get my payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Payment list }
 */
router.get("/my", authenticate, paymentController.getMyPayments);

router.get("/", authenticate, authorize("admin"), paymentController.getAllPayments);
router.get("/order/:orderId", authenticate, paymentController.getPaymentsByOrder);
router.get("/:id", authenticate, paymentController.getPaymentById);
router.post("/:id/refund", authenticate, authorize("admin"), paymentController.refundPayment);

module.exports = router;
