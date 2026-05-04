const https = require("https");
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const paymentRoutes = require("./routes/payments");

const app = express();

// ─── Security: Helmet (sets secure HTTP headers) ─────────────────────────────
// Prevents XSS, clickjacking (X-Frame-Options), MIME sniffing, etc.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"], // Clickjacking protection
      },
    },
    frameguard: { action: "deny" }, // X-Frame-Options: DENY — clickjacking
    xssFilter: true,               // X-XSS-Protection header
    noSniff: true,                 // X-Content-Type-Options
    hsts: {                        // Strict-Transport-Security — forces HTTPS
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// ─── Security: Rate Limiting (DDoS / Brute-force protection) ─────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // max 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter limit on auth endpoints
  message: { error: "Too many authentication attempts. Please try again later." },
});

app.use(globalLimiter);

// ─── CORS (only allow our frontend origin) ───────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "https://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // Limit body size to prevent DoS

// ─── Security: MongoDB Injection Sanitization ────────────────────────────────
// Strips $ and . from request body/query to prevent NoSQL injection
app.use(mongoSanitize());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/payments", paymentRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Never leak stack traces to client
  res.status(err.status || 500).json({ error: "An internal error occurred." });
});

// ─── Database Connection ──────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected securely"))
  .catch((err) => console.error("DB connection error:", err));

// ─── HTTPS Server (SSL/TLS) ───────────────────────────────────────────────────
// In production: replace with real certificates (e.g. from Let's Encrypt)
// For dev: generate with: openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem
const PORT = process.env.PORT || 5001;

try {
  const sslOptions = {
    key: fs.readFileSync("./config/key.pem"),
    cert: fs.readFileSync("./config/cert.pem"),
  };
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`Secure HTTPS server running on port ${PORT}`);
  });
} catch (err) {
  // Fallback to HTTP for development if certificates not present
  console.warn("SSL certs not found — running on HTTP (dev only)");
  app.listen(PORT, () => console.log(`Dev server running on port ${PORT}`));
}
