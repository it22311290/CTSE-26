const { OrderModel, OrderStatus } = require("../models/orderModel");
const serviceClients = require("../utils/serviceClients");

const orderController = {
  createOrder: async (req, res, next) => {
    try {
      const { items, shippingAddress } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0)
        return res.status(400).json({ error: "Order must contain at least one item" });
      if (!shippingAddress)
        return res.status(400).json({ error: "Shipping address is required" });

      // Validate and fetch products + reserve stock
      let subtotal = 0;
      const enrichedItems = [];

      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity < 1)
          return res.status(400).json({ error: "Each item needs productId and quantity >= 1" });

        let product;
        try {
          product = await serviceClients.getProduct(item.productId);
        } catch (err) {
          return res.status(404).json({ error: `Product ${item.productId} not found` });
        }

        try {
          await serviceClients.checkAndReserveStock(item.productId, item.quantity);
        } catch (err) {
          const msg = err.response?.data?.error || "Stock check failed";
          return res.status(409).json({ error: msg, productId: item.productId });
        }

        enrichedItems.push({
          productId: item.productId,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity
        });
        subtotal += product.price * item.quantity;
      }

      const total = parseFloat((subtotal * 1.1).toFixed(2)); // +10% tax

      const order = OrderModel.create({
        userId: req.user.userId,
        items: enrichedItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        total,
        shippingAddress
      });

      // Initiate payment
      try {
        const paymentResp = await serviceClients.initiatePayment(order.id, total, req.user.userId, req.token);
        OrderModel.update(order.id, { paymentId: paymentResp.paymentId, status: OrderStatus.CONFIRMED });
      } catch (err) {
        console.error("Payment initiation failed:", err.message);
        // Restore stock on payment failure
        for (const item of enrichedItems) {
          await serviceClients.restoreStock(item.productId, item.quantity).catch(() => {});
        }
        return res.status(502).json({ error: "Payment initiation failed", orderId: order.id });
      }

      const finalOrder = OrderModel.findById(order.id);
      res.status(201).json({ message: "Order created successfully", order: finalOrder });
    } catch (err) { next(err); }
  },

  getMyOrders: (req, res) => {
    const orders = OrderModel.findByUser(req.user.userId);
    res.json({ orders, count: orders.length });
  },

  getOrderById: (req, res) => {
    const order = OrderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.userId !== req.user.userId && req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied" });
    res.json({ order });
  },

  cancelOrder: async (req, res, next) => {
    try {
      const order = OrderModel.findById(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.userId !== req.user.userId && req.user.role !== "admin")
        return res.status(403).json({ error: "Access denied" });
      if (["shipped","delivered"].includes(order.status))
        return res.status(400).json({ error: `Cannot cancel order with status: ${order.status}` });

      // Restore stock
      for (const item of order.items) {
        await serviceClients.restoreStock(item.productId, item.quantity).catch(err =>
          console.error("Stock restore failed:", err.message));
      }

      const updated = OrderModel.updateStatus(order.id, OrderStatus.CANCELLED);
      res.json({ message: "Order cancelled", order: updated });
    } catch (err) { next(err); }
  },

  getAllOrders: (req, res) => {
    const orders = OrderModel.findAll();
    res.json({ orders, count: orders.length });
  },

  updateOrderStatus: (req, res) => {
    const { status } = req.body;
    const validStatuses = Object.values({ PENDING:"pending",CONFIRMED:"confirmed",PROCESSING:"processing",SHIPPED:"shipped",DELIVERED:"delivered",CANCELLED:"cancelled" });
    if (!validStatuses.includes(status))
      return res.status(400).json({ error: "Invalid status", valid: validStatuses });
    const order = OrderModel.updateStatus(req.params.id, status);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order status updated", order });
  },

  // Internal: called by payment service to confirm payment
  confirmPayment: (req, res) => {
    const { orderId, paymentId } = req.body;
    const order = OrderModel.update(orderId, { paymentId, status: "processing" });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ success: true, order });
  }
};

module.exports = orderController;
