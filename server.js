const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ✅ Allow localhost and Netlify for dev/prod
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

// ✅ Apply CORS
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(bodyParser.json());

// ✅ Root test route
app.get("/", (req, res) => {
  res.send("📚 Medical Ebooks API is live.");
});

// ✅ File paths
const paymentsFile = "./payments.json";
const fulfilledFile = "./fulfilledRequests.json";
const requestsFile = "./bookRequests.json";

// ✅ In-memory data
let paidUsers = [];
let bookRequests = [];

// ✅ Load existing payments
try {
  if (fs.existsSync(paymentsFile)) {
    const data = fs.readFileSync(paymentsFile);
    paidUsers = JSON.parse(data || "[]");
  }
} catch (err) {
  console.error("❌ Failed to read payments file:", err.message);
  paidUsers = [];
}

// ✅ Load existing book requests
try {
  if (fs.existsSync(requestsFile)) {
    const data = fs.readFileSync(requestsFile);
    bookRequests = JSON.parse(data || "[]");
  }
} catch (err) {
  console.error("❌ Failed to read book requests:", err.message);
  bookRequests = [];
}

// ✅ PayPal webhook listener
app.post("/paypal/webhook", (req, res) => {
  try {
    const event = req.body;
    if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
      const payerEmail = event?.resource?.payer?.email_address;
      const bookId = event?.resource?.purchase_units?.[0]?.reference_id;

      if (!payerEmail || !bookId) return res.sendStatus(400);

      paidUsers.push({ email: payerEmail, bookId });
      fs.writeFileSync(paymentsFile, JSON.stringify(paidUsers, null, 2));

      console.log("✅ Payment recorded for:", payerEmail, "Book:", bookId);
      return res.sendStatus(200);
    }

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
    if (!email || !bookId)
      return res.status(400).json({ error: "Missing email or bookId" });

    const found = paidUsers.some(
      (p) => p.email === email && p.bookId === bookId
    );
    res.json({ paid: found });
  } catch (err) {
    console.error("❌ Error checking payment status:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Submit book request
app.post("/api/book-request", (req, res) => {
  try {
    const request = req.body;
    bookRequests.push(request);
    fs.writeFileSync(requestsFile, JSON.stringify(bookRequests, null, 2));
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

// ✅ Get all paid users
app.get("/paid-requests", (req, res) => {
  try {
    res.json(paidUsers);
  } catch (err) {
    console.error("❌ Failed to fetch paid requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Mark a request as fulfilled
app.post("/api/fulfill-request", (req, res) => {
  try {
    const { email, title, author, edition, notes, downloadUrl, price, paid } =
      req.body;

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
      console.log("✅ Fulfilled request for:", email, title);
    }

    res.json({ message: "Marked as fulfilled" });
  } catch (err) {
    console.error("❌ Error fulfilling request:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Get all fulfilled requests
app.get("/api/fulfilled-requests", (req, res) => {
  try {
    const data = fs.existsSync(fulfilledFile)
      ? JSON.parse(fs.readFileSync(fulfilledFile))
      : [];

    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching fulfilled requests:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Global error handler (CORS & others)
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
