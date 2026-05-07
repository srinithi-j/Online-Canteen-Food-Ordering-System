import crypto from "crypto";
import "dotenv/config";
import express from "express";
import Razorpay from "razorpay";

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});

const PORT = Number(process.env.PORT || 3001);

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.warn(
    "Missing Razorpay env vars. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env"
  );
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/payments/razorpay/key", (_req, res) => {
  if (!keyId) return res.status(500).json({ error: "Missing RAZORPAY_KEY_ID" });
  return res.json({ keyId });
});

// Create a Razorpay Order (server-side)
app.post("/api/payments/razorpay/order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body || {};

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amt),
      currency,
      receipt: receipt ? String(receipt) : undefined
    });

    return res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt || null
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to create Razorpay order",
      details: err?.message || String(err)
    });
  }
});

// Verify payment signature (server-side)
app.post("/api/payments/razorpay/verify", (req, res) => {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    } = req.body || {};

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ error: "Missing verification fields" });
    }

    const body = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    const ok = expected === signature;

    return res.json({ verified: ok });
  } catch (err) {
    return res.status(500).json({
      error: "Verification failed",
      details: err?.message || String(err)
    });
  }
});

app.listen(PORT, () => {
  console.log(`CFOS server running on http://localhost:${PORT}`);
});
