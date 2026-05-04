const express = require("express");
const Payment = require("../models/Payment");
const { PAYMENT_REGEX } = require("../models/Payment");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// ─── Input Whitelist Validator ────────────────────────────────────────────────
function validatePaymentInput({ amount, currency, provider, payeeAccountNumber, swiftCode, payeeName }) {
  const errors = [];
  if (!PAYMENT_REGEX.amount.test(amount)) errors.push("Invalid amount. Must be a positive number.");
  if (!PAYMENT_REGEX.currency.test(currency)) errors.push("Invalid currency selection.");
  if (!PAYMENT_REGEX.provider.test(provider)) errors.push("Invalid payment provider.");
  if (!PAYMENT_REGEX.payeeAccount.test(payeeAccountNumber)) errors.push("Invalid payee account number.");
  if (!PAYMENT_REGEX.swiftCode.test(swiftCode?.toUpperCase())) errors.push("Invalid SWIFT/BIC code.");
  if (!PAYMENT_REGEX.payeeName.test(payeeName)) errors.push("Invalid payee name.");
  return errors;
}

// ─── POST /api/payments — Customer submits a new payment ────────────────────
router.post("/", authenticate, authorize("customer"), async (req, res) => {
  try {
    const { amount, currency, provider, payeeAccountNumber, swiftCode, payeeName } = req.body;

    const errors = validatePaymentInput({ amount, currency, provider, payeeAccountNumber, swiftCode, payeeName });
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const payment = new Payment({
      customerId: req.user.id,
      amount,
      currency,
      provider,
      payeeAccountNumber,
      swiftCode: swiftCode.toUpperCase(),
      payeeName,
      status: "pending",
    });

    await payment.save();

    res.status(201).json({
      message: "Payment submitted successfully and is pending review.",
      paymentId: payment._id,
    });
  } catch (err) {
    console.error("Payment submission error:", err);
    res.status(500).json({ error: "Failed to submit payment. Please try again." });
  }
});

// ─── GET /api/payments/my — Customer views their own payments ────────────────
router.get("/my", authenticate, authorize("customer"), async (req, res) => {
  try {
    const payments = await Payment.find({ customerId: req.user.id }).sort({ createdAt: -1 });
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve payments." });
  }
});

module.exports = router;
