const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ✅ Allow all origins temporarily for testing
app.use(cors());

app.use(bodyParser.json());

const paymentsFile = "./payments.json";
let paidUsers = [];

// Load previous payments
try {
  if (fs.existsSync(paymentsFile)) {
    const data = fs.readFileSync(paymentsFile);
    paidUsers = JSON.parse(data || "[]");
  }
} catch (err) {
  console.error("❌ Failed to read payments file:", err.message);
  paidUsers = [];
}

// ✅ Webhook endpoint for PayPal
app.post("/paypal/webhook", (req, res) => {
  try {
    const event = req.body;

    if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
      const payerEmail = event?.resource?.payer?.email_address;
      const bookId = event?.resource?.purchase_units?.[0]?.reference_id;

      if (!payerEmail || !bookId) {
        console.warn("⚠️ Missing payerEmail or bookId");
        return res.sendStatus(400);
      }

      paidUsers.push({ email: payerEmail, bookId });
      fs.writeFileSync(paymentsFile, JSON.stringify(paidUsers, null, 2));

      console.log("✅ Payment recorded for:", payerEmail, "Book:", bookId);
      return res.sendStatus(200);
    }

    console.warn("⚠️ Unsupported event type:", event.event_type);
    res.sendStatus(400);
  } catch (err) {
    console.error("❌ Error handling webhook:", err.message);
    res.sendStatus(500);
  }
});

// ✅ Check if user has paid
app.get("/api/has-paid", (req, res) => {
  try {
    const { email, bookId } = req.query;

    if (!email || !bookId) {
      return res.status(400).json({ error: "Missing email or bookId" });
    }

    const found = paidUsers.some(
      (p) => p.email === email && p.bookId === bookId
    );

    res.json({ paid: found });
  } catch (err) {
    console.error("❌ Error checking payment status:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Save a new book request
app.post("/api/book-request", (req, res) => {
  try {
    const request = req.body;

    const requestsFile = "./bookRequests.json";
    let existing = [];

    if (fs.existsSync(requestsFile)) {
      existing = JSON.parse(fs.readFileSync(requestsFile));
    }

    existing.push(request);
    fs.writeFileSync(requestsFile, JSON.stringify(existing, null, 2));

    res.status(201).json({ message: "Request saved successfully." });
  } catch (err) {
    console.error("❌ Failed to save book request:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ GET all book requests
app.get("/api/book-requests", (req, res) => {
  try {
    const requestsFile = "./bookRequests.json";
    let data = [];

    if (fs.existsSync(requestsFile)) {
      data = JSON.parse(fs.readFileSync(requestsFile));
    }

    res.json(data);
  } catch (err) {
    console.error("❌ Failed to load book requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
