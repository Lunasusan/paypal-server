const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const BookRequest = require("./models/BookRequest");
const FulfilledRequest = require("./models/FulfilledRequest");
const Payment = require("./models/Payment");
const User = require("./models/User"); // ✅ NEW

const app = express();

// ✅ CORS setup
const allowedOrigins = [
  "http://localhost:5173",
  "https://medical-textbooks.netlify.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked CORS origin:", origin);
      callback(new Error("CORS error: Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(bodyParser.json());

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ✅ Root route
app.get("/", (req, res) => {
  res.send("📚 Medical Ebooks API is live.");
});

// ✅ New route to get server outbound IP
app.get("/api/my-ip", async (req, res) => {
  try {
    const response = await axios.get("https://api.ipify.org?format=json");
    res.json({ ip: response.data.ip });
  } catch (error) {
    console.error("❌ Failed to fetch IP:", error.message);
    res.status(500).json({ error: "Failed to fetch IP" });
  }
});

// ✅ Save new user to MongoDB
app.post("/api/users", async (req, res) => {
  try {
    const { email, uid } = req.body;
    if (!email) return res.status(400).json({ error: "Missing email" });

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      await User.create({ email, uid });
      console.log("✅ New user saved:", email);
    } else {
      console.log("ℹ️ User already exists:", email);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Failed to save user:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ PayPal Webhook - save to MongoDB
app.post("/paypal/webhook", async (req, res) => {
  try {
    const event = req.body;

    if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
      const payerEmail = event?.resource?.payer?.email_address;
      const bookId = event?.resource?.purchase_units?.[0]?.reference_id;

      if (!payerEmail || !bookId) return res.sendStatus(400);

      const payment = new Payment({
        email: payerEmail,
        bookId,
        paidAt: new Date(),
      });

      await payment.save();
      console.log("✅ Payment saved:", payerEmail, bookId);
      return res.sendStatus(200);
    }

    res.sendStatus(400);
  } catch (err) {
    console.error("❌ Error handling webhook:", err.message);
    res.sendStatus(500);
  }
});

// ✅ Check payment status
app.get("/api/has-paid", async (req, res) => {
  try {
    const { email, bookId } = req.query;
    if (!email || !bookId) return res.status(400).json({ error: "Missing fields" });

    const found = await Payment.findOne({ email, bookId });
    res.json({ paid: !!found });
  } catch (err) {
    console.error("❌ Error checking payment:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Book Requests
app.post("/api/book-request", async (req, res) => {
  try {
    const request = new BookRequest(req.body);
    await request.save();
    console.log("📥 Book Requested:", request);
    res.status(201).json({ message: "Request saved successfully." });
  } catch (err) {
    console.error("❌ book-request error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/book-requests", async (req, res) => {
  try {
    const requests = await BookRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error("❌ Failed to return book requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Fulfilled Requests
app.post("/api/fulfill-request", async (req, res) => {
  try {
    const {
      email,
      title,
      author,
      edition,
      notes,
      downloadUrl,
      price,
      paid,
    } = req.body;

    const alreadyExists = await FulfilledRequest.findOne({ email, title });

    if (!alreadyExists) {
      const newRequest = new FulfilledRequest({
        email,
        title,
        author,
        edition,
        notes,
        downloadUrl,
        price,
        paid,
      });

      await newRequest.save();
      console.log("✅ Fulfilled request saved:", email, title);
    }

    res.json({ message: "Marked as fulfilled." });
  } catch (err) {
    console.error("❌ Error saving fulfilled request:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/fulfilled-requests", async (req, res) => {
  try {
    const fulfilled = await FulfilledRequest.find().sort({ createdAt: -1 });
    res.json(fulfilled);
  } catch (err) {
    console.error("❌ Error fetching fulfilled requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Admin: All payments
app.get("/api/payments", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ paidAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error("❌ Failed to fetch payments:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Global error:", err.message);
  if (err.message.includes("CORS")) {
    res.status(403).send("Blocked by CORS");
  } else {
    res.status(500).send("Server Error: " + err.message);
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const BookRequest = require("./models/BookRequest");
const FulfilledRequest = require("./models/FulfilledRequest");
const Payment = require("./models/Payment");
const User = require("./models/User");

const app = express();

// ✅ CORS setup
const allowedOrigins = [
  "http://localhost:5173",
  "https://medical-textbooks.netlify.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked CORS origin:", origin);
      callback(new Error("CORS error: Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(bodyParser.json());

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ✅ Root route
app.get("/", (req, res) => {
  res.send("📚 Medical Ebooks API is live.");
});

// ✅ IP check
app.get("/api/my-ip", async (req, res) => {
  try {
    const response = await axios.get("https://api.ipify.org?format=json");
    res.json({ ip: response.data.ip });
  } catch (error) {
    console.error("❌ Failed to fetch IP:", error.message);
    res.status(500).json({ error: "Failed to fetch IP" });
  }
});

// ✅ Save new user to MongoDB
app.post("/api/users", async (req, res) => {
  try {
    const { email, uid } = req.body;
    if (!email) return res.status(400).json({ error: "Missing email" });

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      await User.create({ email, uid });
      console.log("✅ New user saved:", email);
    } else {
      console.log("ℹ️ User already exists:", email);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Failed to save user:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Save PayPal payment to DB
app.post("/paypal/webhook", async (req, res) => {
  try {
    const event = req.body;

    if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
      const payerEmail = event?.resource?.payer?.email_address;
      const bookId = event?.resource?.purchase_units?.[0]?.reference_id;

      if (!payerEmail || !bookId) {
        console.warn("❌ Missing email or bookId in webhook");
        return res.sendStatus(400);
      }

      const existingPayment = await Payment.findOne({ email: payerEmail, bookId });
      if (existingPayment) {
        console.log("ℹ️ Payment already recorded:", payerEmail, bookId);
        return res.sendStatus(200);
      }

      const payment = new Payment({
        email: payerEmail,
        bookId, // should match FulfilledRequest._id
        paidAt: new Date(),
        status: "paid",
      });

      await payment.save();
      console.log("✅ Payment saved:", payerEmail, bookId);
      return res.sendStatus(200);
    }

    res.sendStatus(400);
  } catch (err) {
    console.error("❌ Error handling webhook:", err.message);
    res.sendStatus(500);
  }
});

// ✅ Check if user has paid for a book (used if needed by frontend)
app.get("/api/has-paid", async (req, res) => {
  try {
    const { email, bookId } = req.query;
    if (!email || !bookId) return res.status(400).json({ error: "Missing fields" });

    const found = await Payment.findOne({ email, bookId, status: "paid" });
    res.json({ paid: !!found });
  } catch (err) {
    console.error("❌ Error checking payment:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Return all payments made by a user
app.get("/api/paid-requests", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Missing email" });

    const payments = await Payment.find({ email, status: "paid" });
    res.json(payments);
  } catch (err) {
    console.error("❌ Failed to fetch paid books:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Book request (user requesting a book)
app.post("/api/book-request", async (req, res) => {
  try {
    const request = new BookRequest(req.body);
    await request.save();
    console.log("📥 Book Requested:", request);
    res.status(201).json({ message: "Request saved successfully." });
  } catch (err) {
    console.error("❌ book-request error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/book-requests", async (req, res) => {
  try {
    const requests = await BookRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error("❌ Failed to return book requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Fulfilled book uploads (admin marks request as fulfilled)
app.post("/api/fulfill-request", async (req, res) => {
  try {
    const {
      email,
      title,
      author,
      edition,
      notes,
      downloadUrl,
      price,
      paid,
    } = req.body;

    const alreadyExists = await FulfilledRequest.findOne({ email, title });

    if (!alreadyExists) {
      const newRequest = new FulfilledRequest({
        email,
        title,
        author,
        edition,
        notes,
        downloadUrl,
        price,
        paid,
      });

      await newRequest.save();
      console.log("✅ Fulfilled request saved:", email, title);
    }

    res.json({ message: "Marked as fulfilled." });
  } catch (err) {
    console.error("❌ Error saving fulfilled request:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Return all fulfilled books
app.get("/api/fulfilled-requests", async (req, res) => {
  try {
    const fulfilled = await FulfilledRequest.find().sort({ createdAt: -1 });
    res.json(fulfilled);
  } catch (err) {
    console.error("❌ Error fetching fulfilled requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Admin route - get all payments
app.get("/api/payments", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ paidAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error("❌ Failed to fetch payments:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Global error:", err.message);
  if (err.message.includes("CORS")) {
    res.status(403).send("Blocked by CORS");
  } else {
    res.status(500).send("Server Error: " + err.message);
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
