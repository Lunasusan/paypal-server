const mongoose = require("mongoose");

const FreeBookSchema = new mongoose.Schema(
  {
    title: String,
    author: String,
    description: String,
    downloadUrl: String, // Google Drive, S3, etc.
  },
  { timestamps: true }
);

module.exports = mongoose.model("FreeBook", FreeBookSchema);
