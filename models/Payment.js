const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  email: String,
  bookId: String,
  paidAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Payment", paymentSchema);
