const mongoose = require("mongoose");
const { Order, OrderStatus } = require("../models/orderModel");
const serviceClients = require("../utils/serviceClients");

const orderController = {
  createOrder: async (req, res, next) => {
    try {
      const { items, shippingAddress } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0)
        return res.status(400).json({ error: "Order must contain at least one item" });
      if (!shippingAddress)
        return res.status(400).json({ error: "Shipping address is required" });

      let subtotal = 0;
      const enrichedItems = [];

      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity < 1)
          return res.status(400).json({ error: "Each item needs productId and quantity >= 1" });

        let product;
        try { product = await serviceClients.getProduct(item.productId); }
        catch { return res.status(404).json({ error: `Product ${item.productId} not found` }); }

        try { await serviceClients.checkAndReserveStock(item.productId, item.quantity); }
        catch (err) {
          const msg = err.response?.data?.error || "Stock check failed";
          return res.status(409).json({ error: msg, productId: item.productId });
        }

        enrichedItems.push({
          productId: item.productId,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
        });
        subtotal += product.price * item.quantity;
      }

      const total = parseFloat((subtotal * 1.1).toFixed(2));
      const order = await Order.create({
        userId: req.user.userId,
        items: enrichedItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        total,
        shippingAddress,
      });

      try {
        const paymentResp = await serviceClients.initiatePayment(
          order._id.toString(), total, req.user.userId, req.token
        );
        await Order.findByIdAndUpdate(order._id, {
          $set: { paymentId: paymentResp.paymentId, status: OrderStatus.CONFIRMED }
        });
      } catch (err) {
        console.error("Payment initiation failed:", err.message);
        for (const item of enrichedItems)
          await serviceClients.restoreStock(item.productId, item.quantity).catch(() => {});
        await Order.findByIdAndDelete(order._id);
        return res.status(502).json({ error: "Payment initiation failed" });
      }

      const finalOrder = await Order.findById(order._id);
      res.status(201).json({ message: "Order created successfully", order: finalOrder });
    } catch (err) { next(err); }
  },

  getMyOrders: async (req, res, next) => {
    try {
      const orders = await Order.find({ userId: req.user.userId }).sort({ createdAt: -1 });
      res.json({ orders, count: orders.length });
    } catch (err) { next(err); }
  },

  getOrderById: async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(404).json({ error: "Order not found" });
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.userId !== req.user.userId && req.user.role !== "admin")
        return res.status(403).json({ error: "Access denied" });
      res.json({ order });
    } catch (err) { next(err); }
  },

  cancelOrder: async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(404).json({ error: "Order not found" });
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.userId !== req.user.userId && req.user.role !== "admin")
        return res.status(403).json({ error: "Access denied" });
      if (["shipped", "delivered"].includes(order.status))
        return res.status(400).json({ error: `Cannot cancel order with status: ${order.status}` });

      for (const item of order.items)
        await serviceClients.restoreStock(item.productId, item.quantity).catch(err =>
          console.error("Stock restore failed:", err.message));

      const updated = await Order.findByIdAndUpdate(
        order._id,
        { $set: { status: OrderStatus.CANCELLED } },
        { new: true }
      );
      res.json({ message: "Order cancelled", order: updated });
    } catch (err) { next(err); }
  },

  getAllOrders: async (req, res, next) => {
    try {
      const orders = await Order.find().sort({ createdAt: -1 });
      res.json({ orders, count: orders.length });
    } catch (err) { next(err); }
  },

  updateOrderStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!Object.values(OrderStatus).includes(status))
        return res.status(400).json({ error: "Invalid status", valid: Object.values(OrderStatus) });
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(404).json({ error: "Order not found" });
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        { new: true }
      );
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.json({ message: "Order status updated", order });
    } catch (err) { next(err); }
  },

  confirmPayment: async (req, res, next) => {
    try {
      const { orderId, paymentId } = req.body;
      if (!mongoose.isValidObjectId(orderId))
        return res.status(404).json({ error: "Order not found" });
      const order = await Order.findByIdAndUpdate(
        orderId,
        { $set: { paymentId, status: OrderStatus.PROCESSING } },
        { new: true }
      );
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.json({ success: true, order });
    } catch (err) { next(err); }
  }
};

module.exports = orderController;
