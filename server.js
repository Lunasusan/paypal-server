const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ✅ Allow only your deployed frontend to talk to backend
app.use(cors({
  origin: "https://medical-ebooks.netlify.app",
}));

app.use(bodyParser.json());

const paymentsFile = "./payments.json";
const fulfilledFile = "./fulfilledRequests.json";
let paidUsers = [];

// ✅ Load previously paid records from file
try {
  if (fs.existsSync(paymentsFile)) {
    const data = fs.readFileSync(paymentsFile);
    paidUsers = JSON.parse(data || "[]");
  }
} catch (err) {
  console.error("❌ Failed to read payments file:", err.message);
  paidUsers = [];
}

// ✅ Webhook endpoint for PayPal payments
app.post("/paypal/webhook", (req, res) => {
  try {
    const event = req.body;

    if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
      const payerEmail = event?.resource?.payer?.email_address;
      const bookId =
        event?.resource?.invoice_id ||
        event?.resource?.purchase_units?.[0]?.reference_id;

      if (!payerEmail || !bookId) {
        console.warn("⚠️ Missing payerEmail or bookId");
        return res.sendStatus(400);
      }

      paidUsers.push({ email: payerEmail, bookId });
      fs.writeFileSync(paymentsFile, JSON.stringify(paidUsers, null, 2));

      console.log("✅ Payment recorded:", payerEmail, "Book:", bookId);
      return res.sendStatus(200);
    }

    console.warn("⚠️ Unrecognized event type:", event.event_type);
    res.sendStatus(400);
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.sendStatus(500);
  }
});

// ✅ Check if a user has paid for a book
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
    console.error("❌ has-paid error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Save book requests
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
    console.error("❌ book-request error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get all book requests
app.get("/api/book-requests", (req, res) => {
  try {
    const requestsFile = "./bookRequests.json";
    const data = fs.existsSync(requestsFile)
      ? JSON.parse(fs.readFileSync(requestsFile))
      : [];

    res.json(data);
  } catch (err) {
    console.error("❌ get book-requests error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get all fulfilled requests
app.get("/api/fulfilled-requests", (req, res) => {
  const data = fs.existsSync(fulfilledFile)
    ? JSON.parse(fs.readFileSync(fulfilledFile))
    : [];

  res.json(data);
});

// ✅ Mark a request as fulfilled (by admin)
app.put("/fulfill-request", (req, res) => {
  const { email, bookId } = req.body;

  if (!email || !bookId) {
    return res.status(400).json({ error: "Missing email or bookId" });
  }

  const existing = fs.existsSync(fulfilledFile)
    ? JSON.parse(fs.readFileSync(fulfilledFile))
    : [];

  const alreadyMarked = existing.some(
    (r) => r.email === email && r.bookId === bookId
  );

  if (!alreadyMarked) {
    existing.push({ email, bookId });
    fs.writeFileSync(fulfilledFile, JSON.stringify(existing, null, 2));
  }

  res.json({ message: "Marked as fulfilled" });
});

// ✅ Admin: View all paid users
app.get("/paid-requests", (req, res) => {
  res.json(paidUsers);
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
