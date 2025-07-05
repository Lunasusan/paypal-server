const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    uid: { type: String }, // Firebase UID (optional but useful)
    role: { type: String, default: "user" }, // or "admin"
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
