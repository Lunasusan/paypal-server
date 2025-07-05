const mongoose = require("mongoose");

const FulfilledRequestSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    title: { type: String, required: true },
    author: { type: String },
    edition: { type: String, default: "N/A" },
    notes: { type: String, default: "" },
    downloadUrl: { type: String, required: true },
    price: { type: Number, required: true },
    paid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FulfilledRequest", FulfilledRequestSchema);
