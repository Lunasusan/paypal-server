const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const BookRequest = require("./models/BookRequest");
const FulfilledRequest = require("./models/FulfilledRequest");
const Payment = require("./models/Payment");

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
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ✅ Root route
app.get("/", (req, res) => {
  res.send("📚 Medical Ebooks API is live.");
});

// ✅ PayPal Webhook - save to MongoDB
app.post("/paypal/webhook", async (req, res) => {
  try {
    const event = req.body;
    if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
      const payerEmail = event?.resource?.payer?.email_address;
      const bookId = event?.resource?.purchase_units?.[0]?.reference_id;

      if (!payerEmail || !bookId) return res.sendStatus(400);

      const payment = new Payment({ email: payerEmail, bookId });
      await payment.save();

      console.log("✅ Payment saved to MongoDB:", payerEmail, bookId);
      return res.sendStatus(200);
    }

    res.sendStatus(400);
  } catch (err) {
    console.error("❌ Error handling webhook:", err.message);
    res.sendStatus(500);
  }
});

// ✅ Check if user has paid (MongoDB)
app.get("/api/has-paid", async (req, res) => {
  try {
    const { email, bookId } = req.query;
    if (!email || !bookId)
      return res.status(400).json({ error: "Missing email or bookId" });

    const found = await Payment.findOne({ email, bookId });
    res.json({ paid: !!found });
  } catch (err) {
    console.error("❌ Error checking payment status:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Book Requests (MongoDB)
app.post("/api/book-request", async (req, res) => {
  try {
    const request = new BookRequest(req.body);
    await request.save();
    console.log("📥 Book Requested (MongoDB):", request);
    res.status(201).json({ message: "Request saved successfully." });
  } catch (err) {
    console.error("❌ book-request error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/book-requests", async (req, res) => {
  try {
    const requests = await BookRequest.find().sort({ timestamp: -1 });
    res.json(requests);
  } catch (err) {
    console.error("❌ Failed to return book requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Fulfilled Requests (MongoDB)
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
      console.log("✅ Fulfilled request saved to MongoDB:", email, title);
    }

    res.json({ message: "Marked as fulfilled." });
  } catch (err) {
    console.error("❌ Error saving fulfilled request:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/fulfilled-requests", async (req, res) => {
  try {
    const fulfilled = await FulfilledRequest.find().sort({ fulfilledAt: -1 });
    res.json(fulfilled);
  } catch (err) {
    console.error("❌ Error fetching fulfilled requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Admin route: Get all payments
app.get("/paid-requests", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ paidAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error("❌ Failed to fetch paid requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Global error handler:", err.message);
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
