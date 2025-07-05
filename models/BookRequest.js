const mongoose = require("mongoose");

const bookRequestSchema = new mongoose.Schema({
  email: String,
  title: String,
  author: String,
  edition: String,
  notes: String,
  price: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("BookRequest", bookRequestSchema);
