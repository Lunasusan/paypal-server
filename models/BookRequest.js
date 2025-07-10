const mongoose = require("mongoose");

const BookRequestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    author: {
      type: String,
    },
    edition: {
      type: String,
      default: "N/A",
    },
    email: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    image: {
      type: String, // Store relative path or URL to uploaded image
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model("BookRequest", BookRequestSchema);
