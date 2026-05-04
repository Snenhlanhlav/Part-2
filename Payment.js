const mongoose = require("mongoose");

// ─── Input Validation RegEx Patterns ─────────────────────────────────────────
const PAYMENT_REGEX = {
  amount: /^\d+(\.\d{1,2})?$/,                     // Positive decimal, max 2 decimal places
  currency: /^(USD|EUR|GBP|ZAR|JPY|AUD|CAD|CHF)$/, // Whitelisted currencies
  provider: /^(SWIFT)$/,                             // Only SWIFT for now
  payeeAccount: /^\d{8,34}$/,                        // IBAN-like: 8-34 digits
  swiftCode: /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/, // SWIFT/BIC format: AAAA-BB-CC[-DDD]
  payeeName: /^[a-zA-Z\s'-]{2,100}$/,
};

const paymentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: String,
      required: true,
      validate: {
        validator: (v) => PAYMENT_REGEX.amount.test(v),
        message: "Invalid amount format.",
      },
    },
    currency: {
      type: String,
      required: true,
      validate: {
        validator: (v) => PAYMENT_REGEX.currency.test(v),
        message: "Invalid or unsupported currency.",
      },
    },
    provider: {
      type: String,
      required: true,
      validate: {
        validator: (v) => PAYMENT_REGEX.provider.test(v),
        message: "Invalid payment provider.",
      },
    },
    payeeAccountNumber: {
      type: String,
      required: true,
      validate: {
        validator: (v) => PAYMENT_REGEX.payeeAccount.test(v),
        message: "Invalid payee account number.",
      },
    },
    swiftCode: {
      type: String,
      required: true,
      uppercase: true,
      validate: {
        validator: (v) => PAYMENT_REGEX.swiftCode.test(v.toUpperCase()),
        message: "Invalid SWIFT/BIC code format.",
      },
    },
    payeeName: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => PAYMENT_REGEX.payeeName.test(v),
        message: "Invalid payee name format.",
      },
    },
    status: {
      type: String,
      enum: ["pending", "verified", "submitted"],
      default: "pending",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
module.exports.PAYMENT_REGEX = PAYMENT_REGEX;
