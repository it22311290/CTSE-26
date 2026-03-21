const mongoose = require("mongoose");

const OrderStatus = {
  PENDING:    "pending",
  CONFIRMED:  "confirmed",
  PROCESSING: "processing",
  SHIPPED:    "shipped",
  DELIVERED:  "delivered",
  CANCELLED:  "cancelled",
};

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name:      { type: String, required: true },
  price:     { type: Number, required: true },
  quantity:  { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true },
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
  street:  { type: String, required: true },
  city:    { type: String, required: true },
  country: { type: String, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    // Human-readable order number e.g. ORD-00001
    orderNumber: { type: String, unique: true },
    userId:          { type: String, required: true, index: true },
    items:           [orderItemSchema],
    subtotal:        { type: Number, required: true },
    total:           { type: Number, required: true },
    status:          { type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING },
    shippingAddress: shippingAddressSchema,
    paymentId:       { type: String, default: null },
  },
  { timestamps: true }
);

// Auto-generate orderNumber before save
orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

orderSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = { Order, OrderStatus };
