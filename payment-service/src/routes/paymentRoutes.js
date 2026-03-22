const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { authenticate, authorize } = require("../middleware/auth");

/**
 * @swagger
 * /api/payments/initiate:
 * post:
 * summary: Initiate payment for an order
 * tags: [Payments]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required: [orderId, amount, userId]
 * properties:
 * orderId: { type: string }
 * amount: { type: number }
 * userId: { type: string }
 * method: { type: string, enum: [card, paypal, bank_transfer] }
 * responses:
 * 202: { description: Payment initiated }
 * 400: { description: Bad request, missing parameters or invalid amount }
 * 409: { description: Already paid }
 */
router.post("/initiate", authenticate, paymentController.initiatePayment);

/**
 * @swagger
 * /api/payments/my:
 * get:
 * summary: Get my payment history
 * tags: [Payments]
 * security:
 * - bearerAuth: []
 * responses:
 * 200: { description: Payment list }
 */
router.get("/my", authenticate, paymentController.getMyPayments);

/**
 * @swagger
 * /api/payments:
 * get:
 * summary: Get all payments (Admin only)
 * tags: [Payments]
 * security:
 * - bearerAuth: []
 * responses:
 * 200: { description: List of all payments }
 * 403: { description: Forbidden, admin role required }
 */
router.get("/", authenticate, authorize("admin"), paymentController.getAllPayments);

/**
 * @swagger
 * /api/payments/order/{orderId}:
 * get:
 * summary: Get payments by order ID
 * tags: [Payments]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: orderId
 * required: true
 * schema:
 * type: string
 * description: The order ID
 * responses:
 * 200: { description: List of payments for the given order }
 */
router.get("/order/:orderId", authenticate, paymentController.getPaymentsByOrder);

/**
 * @swagger
 * /api/payments/{id}:
 * get:
 * summary: Get payment by ID
 * tags: [Payments]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: The payment ID
 * responses:
 * 200: { description: Payment details }
 * 403: { description: Forbidden, access denied }
 * 404: { description: Payment not found }
 */
router.get("/:id", authenticate, paymentController.getPaymentById);

/**
 * @swagger
 * /api/payments/{id}/refund:
 * post:
 * summary: Refund a payment (Admin only)
 * tags: [Payments]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: The payment ID to refund
 * responses:
 * 200: { description: Payment refunded successfully }
 * 400: { description: Cannot refund payment with current status }
 * 403: { description: Forbidden, admin role required }
 * 404: { description: Payment not found }
 */
router.post("/:id/refund", authenticate, authorize("admin"), paymentController.refundPayment);

module.exports = router;