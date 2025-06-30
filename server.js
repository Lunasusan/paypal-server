const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: "https://medical-ebooks.netlify.app",
}));

app.use(bodyParser.json());

const paymentsFile = "./payments.json";
const fulfilledFile = "./fulfilledRequests.json";
let paidUsers = [];

// ✅ In-memory storage for book requests (temporary fix for Render)
let bookRequests = [];

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

// ✅ Save a new book request (in memory)
app.post("/api/book-request", (req, res) => {
  try {
    const request = req.body;
    bookRequests.push(request);
    console.log("📥 Book Requested:", request);
    res.status(201).json({ message: "Request saved successfully." });
  } catch (err) {
    console.error("❌ book-request error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get all book requests
app.get("/api/book-requests", (req, res) => {
  try {
    res.json(bookRequests);
  } catch (err) {
    console.error("❌ Failed to return book requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Return all paid requests
app.get("/paid-requests", (req, res) => {
  res.json(paidUsers);
});

// ✅ Mark a request as fulfilled
app.post("/api/fulfill-request", (req, res) => {
  const { email, title, author, edition, notes, downloadUrl, price, paid } = req.body;

  const existing = fs.existsSync(fulfilledFile)
    ? JSON.parse(fs.readFileSync(fulfilledFile))
    : [];

  const alreadyMarked = existing.some(
    (r) => r.email === email && r.title === title
  );

  if (!alreadyMarked) {
    existing.push({
      email,
      title,
      author,
      edition,
      notes,
      downloadUrl,
      price,
      paid,
    });
    fs.writeFileSync(fulfilledFile, JSON.stringify(existing, null, 2));
  }

  res.json({ message: "Marked as fulfilled" });
});

// ✅ Return all fulfilled requests
app.get("/api/fulfilled-requests", (req, res) => {
  const data = fs.existsSync(fulfilledFile)
    ? JSON.parse(fs.readFileSync(fulfilledFile))
    : [];

  res.json(data);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
