const mongoose = require("mongoose");

const PaymentStatus = {
  PENDING:    "pending",
  PROCESSING: "processing",
  COMPLETED:  "completed",
  FAILED:     "failed",
  REFUNDED:   "refunded",
};

const paymentSchema = new mongoose.Schema(
  {

    paymentNumber:  { type: String, unique: true },
    orderId:        { type: String, required: true, index: true },
    userId:         { type: String, required: true, index: true },
    amount:         { type: Number, required: true, min: 0.01 },
    currency:       { type: String, default: "USD" },
    method:         { type: String, enum: ["card", "paypal", "bank_transfer"], default: "card" },
    status:         { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING },
    transactionRef: { type: String, unique: true },
  },
  { timestamps: true }
);

paymentSchema.pre("save", async function (next) {
  if (this.isNew) {
    if (!this.paymentNumber) {
      const count = await mongoose.model("Payment").countDocuments();
      this.paymentNumber = `PAY-${String(count + 1).padStart(5, "0")}`;
    }
    if (!this.transactionRef) {
      this.transactionRef = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }
  }
  next();
});

paymentSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = { Payment, PaymentStatus };
