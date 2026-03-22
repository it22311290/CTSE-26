const mongoose = require("mongoose");
const axios = require("axios");
const { Payment, PaymentStatus } = require("../models/paymentModel");

const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || "http://order-service:3003";

const simulateGateway = () => Math.random() > 0.05; // 95% success

const paymentController = {
  initiatePayment: async (req, res, next) => {
    try {
      const { orderId, amount, userId, method = "card" } = req.body;
      if (!orderId || !amount || !userId)
        return res.status(400).json({ error: "orderId, amount, and userId are required" });
      if (amount <= 0)
        return res.status(400).json({ error: "Amount must be positive" });

      const existingSuccess = await Payment.findOne({ orderId, status: PaymentStatus.COMPLETED });
      if (existingSuccess)
        return res.status(409).json({ error: "Order already paid", payment: existingSuccess });

      const payment = await Payment.create({ orderId, userId, amount, method });
      await Payment.findByIdAndUpdate(payment._id, { $set: { status: PaymentStatus.PROCESSING } });

      // Simulate async gateway processing
      setTimeout(async () => {
        const success = simulateGateway();
        const newStatus = success ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;
        await Payment.findByIdAndUpdate(payment._id, { $set: { status: newStatus } });

        if (success) {
          try {
            await axios.post(`${ORDER_SERVICE}/api/orders/internal/confirm-payment`, {
              orderId, paymentId: payment._id.toString()
            });
          } catch (err) {
            console.error("Failed to notify order service:", err.message);
          }
        }
      }, 2000).unref();

      res.status(202).json({
        message: "Payment initiated",
        paymentId: payment._id.toString(),
        transactionRef: payment.transactionRef,
        status: PaymentStatus.PROCESSING,
      });
    } catch (err) { next(err); }
  },

  getPaymentById: async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(404).json({ error: "Payment not found" });
      const payment = await Payment.findById(req.params.id);
      if (!payment) return res.status(404).json({ error: "Payment not found" });
      if (payment.userId !== req.user.userId && req.user.role !== "admin")
        return res.status(403).json({ error: "Access denied" });
      res.json({ payment });
    } catch (err) { next(err); }
  },

  getPaymentsByOrder: async (req, res, next) => {
    try {
      const payments = await Payment.find({ orderId: req.params.orderId });
      res.json({ payments });
    } catch (err) { next(err); }
  },

  getMyPayments: async (req, res, next) => {
    try {
      const payments = await Payment.find({ userId: req.user.userId }).sort({ createdAt: -1 });
      res.json({ payments, count: payments.length });
    } catch (err) { next(err); }
  },

  getAllPayments: async (req, res, next) => {
    try {
      const payments = await Payment.find().sort({ createdAt: -1 });
      res.json({ payments, count: payments.length });
    } catch (err) { next(err); }
  },

  refundPayment: async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(404).json({ error: "Payment not found" });
      const payment = await Payment.findById(req.params.id);
      if (!payment) return res.status(404).json({ error: "Payment not found" });
      if (payment.status !== PaymentStatus.COMPLETED)
        return res.status(400).json({ error: `Cannot refund payment with status: ${payment.status}` });

      const refunded = await Payment.findByIdAndUpdate(
        payment._id,
        { $set: { status: PaymentStatus.REFUNDED } },
        { new: true }
      );
      res.json({ message: "Payment refunded successfully", payment: refunded });
    } catch (err) { next(err); }
  }
};

module.exports = paymentController;
