const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    bookId: { type: String, required: true },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);
