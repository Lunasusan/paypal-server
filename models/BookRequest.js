const mongoose = require("mongoose");

const BookRequestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String },
    edition: { type: String, default: "N/A" },
    email: { type: String, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true } // Adds createdAt and updatedAt fields automatically
);

module.exports = mongoose.model("BookRequest", BookRequestSchema);
