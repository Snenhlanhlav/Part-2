const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ─── Input Validation RegEx Patterns ──────────────────────────────────────────
// These are used server-side to whitelist inputs before saving
const REGEX = {
  fullName: /^[a-zA-Z\s'-]{2,100}$/,          // Letters, spaces, hyphens, apostrophes
  idNumber: /^\d{13}$/,                         // SA ID: exactly 13 digits
  accountNumber: /^\d{8,16}$/,                  // 8-16 digit account number
  username: /^[a-zA-Z0-9_.-]{3,30}$/,           // Alphanumeric + _ . -
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, // Strong password
};

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => REGEX.fullName.test(v),
        message: "Invalid full name format.",
      },
    },
    idNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: (v) => REGEX.idNumber.test(v),
        message: "ID number must be exactly 13 digits.",
      },
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: (v) => REGEX.accountNumber.test(v),
        message: "Account number must be 8-16 digits.",
      },
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: (v) => REGEX.username.test(v),
        message: "Username may only contain letters, numbers, underscores, dots, or hyphens.",
      },
    },
    password: {
      type: String,
      required: true,
      // Raw password is never stored — hashed below
    },
    role: {
      type: String,
      enum: ["customer", "employee"],
      default: "customer",
    },
  },
  { timestamps: true }
);

// ─── Pre-save Hook: Hash & Salt Password ──────────────────────────────────────
// bcrypt automatically generates a unique salt per user (cost factor 12)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const SALT_ROUNDS = 12;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

// ─── Instance Method: Compare Password ────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
module.exports.REGEX = REGEX;
