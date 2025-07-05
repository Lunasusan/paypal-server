const mongoose = require("mongoose");

const fulfilledRequestSchema = new mongoose.Schema({
  email: String,
  title: String,
  author: String,
  edition: String,
  notes: String,
  downloadUrl: String,
  price: String,
  paid: Boolean,
  fulfilledAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("FulfilledRequest", fulfilledRequestSchema);
