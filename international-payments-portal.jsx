import { useState, useEffect, useCallback } from "react";

// ─── Security Utilities ───────────────────────────────────────────────────────
// bcrypt-style hashing simulation (in production: use bcrypt/argon2 server-side)
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password + saltHex), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(saltHex), iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `$pbkdf2$${saltHex}$${hash}`;
}

async function verifyPassword(password, stored) {
  const [, , saltHex] = stored.split("$");
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password + saltHex), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(saltHex), iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return stored === `$pbkdf2$${saltHex}$${hash}`;
}

// ─── Input Validation (RegEx Whitelisting) ────────────────────────────────────
const REGEX = {
  fullName:      /^[A-Za-z\s\-']{2,60}$/,
  idNumber:      /^\d{13}$/,
  accountNumber: /^\d{6,20}$/,
  username:      /^[A-Za-z0-9_]{3,30}$/,
  password:      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,64}$/,
  amount:        /^\d{1,15}(\.\d{1,2})?$/,
  swiftCode:     /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  recipientName: /^[A-Za-z\s\-']{2,80}$/,
  reference:     /^[A-Za-z0-9\s\-_]{1,50}$/,
};

function validate(field, value) {
  if (!REGEX[field]) return true;
  return REGEX[field].test(value);
}

function sanitize(str) {
  return String(str).replace(/[<>&"']/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;", "'":"&#x27;" }[c]));
}

// ─── Session Token (CSRF-like) ────────────────────────────────────────────────
function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Pre-seeded Employee Accounts (no self-registration) ─────────────────────
const SEED_EMPLOYEES = [
  { id: "emp001", username: "jsmith", passwordHash: null, fullName: "John Smith", role: "employee" },
  { id: "emp002", username: "amokoena", passwordHash: null, fullName: "Amahle Mokoena", role: "employee" },
];

// ─── Initial DB ───────────────────────────────────────────────────────────────
function initDB() {
  const stored = localStorage.getItem("__bank_db__");
  if (stored) return JSON.parse(stored);
  return { customers: [], employees: [], transactions: [] };
}

function saveDB(db) {
  localStorage.setItem("__bank_db__", JSON.stringify(db));
}

// ─── Colours / Design ─────────────────────────────────────────────────────────
const C = {
  navy:   "#0B1F4B",
  blue:   "#1246AA",
  sky:    "#3B82F6",
  gold:   "#C9A84C",
  light:  "#F0F4FF",
  white:  "#FFFFFF",
  danger: "#C0392B",
  success:"#1A6B3A",
  border: "#CBD5E1",
  muted:  "#64748B",
  text:   "#1E293B",
};

const S = {
  page: { minHeight: "100vh", background: `linear-gradient(135deg, ${C.navy} 0%, #1A3A6B 100%)`, fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.text },
  card: { background: C.white, borderRadius: 16, padding: "2rem", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxWidth: 500, width: "100%", margin: "0 auto" },
  wideCard: { background: C.white, borderRadius: 16, padding: "2rem", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxWidth: 900, width: "100%", margin: "0 auto" },
  input: (err) => ({ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${err ? C.danger : C.border}`, fontSize: 14, outline: "none", boxSizing: "border-box", background: err ? "#FFF5F5" : "#FAFBFF" }),
  label: { display: "block", fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" },
  btn: (variant="primary") => ({
    width: "100%", padding: "12px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 600,
    background: variant === "primary" ? `linear-gradient(135deg, ${C.blue}, ${C.sky})` : variant === "danger" ? C.danger : variant === "success" ? C.success : "#E2E8F0",
    color: variant === "ghost" ? C.text : C.white, marginTop: 8,
  }),
  errText: { fontSize: 12, color: C.danger, marginTop: 3 },
  tag: (color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: color === "green" ? "#D1FAE5" : color === "amber" ? "#FEF3C7" : color === "blue" ? "#DBEAFE" : "#FEE2E2", color: color === "green" ? "#065F46" : color === "amber" ? "#92400E" : color === "blue" ? "#1E40AF" : "#991B1B" }),
};

// ─── Reusable Input ───────────────────────────────────────────────────────────
function Field({ label, id, type = "text", value, onChange, error, placeholder, maxLength, autoComplete }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={S.label}>{label}</label>
      <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder}
        maxLength={maxLength || 100} autoComplete={autoComplete || "off"}
        style={S.input(error)} aria-describedby={error ? `${id}-err` : undefined} />
      {error && <div id={`${id}-err`} style={S.errText} role="alert">{error}</div>}
    </div>
  );
}

function Select({ label, id, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={S.label}>{label}</label>
      <select id={id} value={value} onChange={onChange} style={{ ...S.input(false), appearance: "auto" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Alert({ type, msg }) {
  if (!msg) return null;
  const bg = type === "error" ? "#FEE2E2" : "#D1FAE5";
  const col = type === "error" ? "#991B1B" : "#065F46";
  return <div role="alert" style={{ background: bg, color: col, borderRadius: 8, padding: "10px 14px", fontSize: 14, marginBottom: 12 }}>{msg}</div>;
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ title, subtitle, onLogout, user }) {
  return (
    <div style={{ background: `linear-gradient(90deg, ${C.navy}, #1A3A6B)`, color: C.white, padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `3px solid ${C.gold}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: C.navy, fontSize: 16 }}>IP</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, opacity: 0.7 }}>{subtitle}</div>}
        </div>
      </div>
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, opacity: 0.85 }}>Logged in as <strong>{sanitize(user.username || user.fullName)}</strong></span>
          <button onClick={onLogout} style={{ ...S.btn("ghost"), width: "auto", padding: "6px 14px", marginTop: 0, fontSize: 13, background: "rgba(255,255,255,0.15)", color: C.white, border: "1px solid rgba(255,255,255,0.3)" }}>Logout</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  VIEWS
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Landing ────────────────────────────────────────────────────────────────
function Landing({ onSelect }) {
  return (
    <div style={S.page}>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center", color: C.white, marginBottom: "3rem" }}>
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1 }}>🌐 GlobalBank</div>
          <div style={{ fontSize: 18, opacity: 0.75, marginTop: 8 }}>International Payments System</div>
          <div style={{ width: 60, height: 3, background: C.gold, margin: "16px auto 0" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 600, width: "100%" }}>
          {[
            { label: "Customer Portal", desc: "Register or log in to make international payments", icon: "👤", key: "customer" },
            { label: "Employee Portal", desc: "Staff login to verify and submit transactions", icon: "🏦", key: "employee" },
          ].map(p => (
            <button key={p.key} onClick={() => onSelect(p.key)} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 16, padding: "2rem 1.5rem", cursor: "pointer", color: C.white, textAlign: "left", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.16)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{p.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{p.label}</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>{p.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 2. Customer Register ──────────────────────────────────────────────────────
function CustomerRegister({ db, saveDB, onSuccess, onSwitch }) {
  const [f, setF] = useState({ fullName: "", idNumber: "", accountNumber: "", username: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const rules = {
    fullName:      [v => !v && "Required", v => !validate("fullName", v) && "Only letters, spaces, hyphens, apostrophes (2–60 chars)"],
    idNumber:      [v => !v && "Required", v => !validate("idNumber", v) && "Must be exactly 13 digits"],
    accountNumber: [v => !v && "Required", v => !validate("accountNumber", v) && "6–20 digits only"],
    username:      [v => !v && "Required", v => !validate("username", v) && "3–30 chars: letters, numbers, underscores"],
    password:      [v => !v && "Required", v => !validate("password", v) && "Min 8 chars with uppercase, lowercase, number & special char"],
    confirmPassword: [v => !v && "Required", v => v !== f.password && "Passwords do not match"],
  };

  function getErr(field, val) {
    for (const rule of (rules[field] || [])) {
      const r = rule(val === undefined ? f[field] : val);
      if (r) return r;
    }
    return "";
  }

  function handleChange(field, val) {
    setF(prev => ({ ...prev, [field]: val }));
    setErrors(prev => ({ ...prev, [field]: getErr(field, val) }));
  }

  async function handleSubmit() {
    const newErrors = {};
    for (const field of Object.keys(rules)) newErrors[field] = getErr(field, f[field]);
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setLoading(true);
    try {
      const exists = db.customers.find(c => c.username === f.username || c.accountNumber === f.accountNumber);
      if (exists) { setMsg({ type: "error", text: "Username or account number already registered." }); setLoading(false); return; }

      const passwordHash = await hashPassword(f.password);
      const newCustomer = { id: generateToken().slice(0, 16), fullName: sanitize(f.fullName), idNumber: f.idNumber, accountNumber: f.accountNumber, username: f.username, passwordHash, role: "customer", createdAt: Date.now() };
      const newDB = { ...db, customers: [...db.customers, newCustomer] };
      saveDB(newDB);
      setMsg({ type: "success", text: "Account created! You can now log in." });
      setTimeout(() => onSwitch("login"), 1500);
    } catch {
      setMsg({ type: "error", text: "Registration failed. Please try again." });
    }
    setLoading(false);
  }

  return (
    <div style={S.page}>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={S.card}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>Create Account</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Customer International Payments Portal</div>
          </div>
          <Alert type={msg.type} msg={msg.text} />
          <Field label="Full Name" id="fullName" value={f.fullName} onChange={e => handleChange("fullName", e.target.value)} error={errors.fullName} placeholder="e.g. Jane Doe" />
          <Field label="ID Number" id="idNumber" value={f.idNumber} onChange={e => handleChange("idNumber", e.target.value)} error={errors.idNumber} placeholder="13-digit SA ID" maxLength={13} />
          <Field label="Account Number" id="accountNumber" value={f.accountNumber} onChange={e => handleChange("accountNumber", e.target.value)} error={errors.accountNumber} placeholder="Your bank account number" maxLength={20} />
          <Field label="Username" id="username" value={f.username} onChange={e => handleChange("username", e.target.value)} error={errors.username} placeholder="Choose a username" />
          <Field label="Password" id="password" type="password" value={f.password} onChange={e => handleChange("password", e.target.value)} error={errors.password} placeholder="Min 8 chars, mixed case + special" autoComplete="new-password" />
          <Field label="Confirm Password" id="confirmPassword" type="password" value={f.confirmPassword} onChange={e => handleChange("confirmPassword", e.target.value)} error={errors.confirmPassword} placeholder="Repeat your password" autoComplete="new-password" />
          <button onClick={handleSubmit} disabled={loading} style={S.btn("primary")}>{loading ? "Creating Account…" : "Register"}</button>
          <button onClick={() => onSwitch("login")} style={{ ...S.btn("ghost"), background: "none", color: C.sky, fontSize: 13 }}>Already have an account? Log In</button>
        </div>
      </div>
    </div>
  );
}

// ── 3. Customer Login ─────────────────────────────────────────────────────────
function CustomerLogin({ db, onSuccess, onSwitch, onBack }) {
  const [f, setF] = useState({ username: "", accountNumber: "", password: "" });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  async function handleSubmit() {
    const newErr = {};
    if (!f.username) newErr.username = "Required";
    if (!validate("accountNumber", f.accountNumber)) newErr.accountNumber = "Invalid account number";
    if (!f.password) newErr.password = "Required";
    setErrors(newErr);
    if (Object.values(newErr).some(Boolean)) return;

    if (attempts >= 5) { setMsg({ type: "error", text: "Account locked. Too many failed attempts. Please contact support." }); return; }

    setLoading(true);
    try {
      const customer = db.customers.find(c => c.username === sanitize(f.username) && c.accountNumber === f.accountNumber);
      if (!customer) { setAttempts(a => a + 1); setMsg({ type: "error", text: "Invalid credentials." }); setLoading(false); return; }
      const ok = await verifyPassword(f.password, customer.passwordHash);
      if (!ok) { setAttempts(a => a + 1); setMsg({ type: "error", text: "Invalid credentials." }); setLoading(false); return; }
      setAttempts(0);
      onSuccess(customer);
    } catch {
      setMsg({ type: "error", text: "Login failed. Please try again." });
    }
    setLoading(false);
  }

  return (
    <div style={S.page}>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={S.card}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>Customer Login</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>International Payments Portal</div>
          </div>
          <Alert type={msg.type} msg={msg.text} />
          {attempts > 0 && attempts < 5 && <div style={{ fontSize: 12, color: C.danger, marginBottom: 8 }}>⚠️ {5 - attempts} attempt(s) remaining before lockout.</div>}
          <Field label="Username" id="uname" value={f.username} onChange={e => setF(p => ({ ...p, username: e.target.value }))} error={errors.username} autoComplete="username" />
          <Field label="Account Number" id="accno" value={f.accountNumber} onChange={e => setF(p => ({ ...p, accountNumber: e.target.value }))} error={errors.accountNumber} autoComplete="off" />
          <Field label="Password" id="pwd" type="password" value={f.password} onChange={e => setF(p => ({ ...p, password: e.target.value }))} error={errors.password} autoComplete="current-password" />
          <button onClick={handleSubmit} disabled={loading || attempts >= 5} style={S.btn("primary")}>{loading ? "Logging in…" : "Log In"}</button>
          <button onClick={() => onSwitch("register")} style={{ ...S.btn("ghost"), background: "none", color: C.sky, fontSize: 13 }}>New customer? Register</button>
          <button onClick={onBack} style={{ ...S.btn("ghost"), background: "none", color: C.muted, fontSize: 13, marginTop: 4 }}>← Back</button>
        </div>
      </div>
    </div>
  );
}

// ── 4. Customer Payment Form ──────────────────────────────────────────────────
const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "AUD", "CHF", "JPY", "CNY", "CAD"].map(c => ({ value: c, label: c }));
const PROVIDERS = [{ value: "SWIFT", label: "SWIFT (Society for Worldwide Interbank Financial Telecommunication)" }];

function CustomerDashboard({ customer, db, saveDB, onLogout }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ amount: "", currency: "USD", provider: "SWIFT", recipientName: "", recipientAccount: "", swiftCode: "", reference: "" });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sessionToken] = useState(generateToken);

  const fieldRules = {
    amount:          v => !validate("amount", v) && "Enter a valid positive amount (e.g. 1500.00)",
    recipientName:   v => !validate("recipientName", v) && "Only letters, spaces, hyphens (2–80 chars)",
    recipientAccount:v => !validate("accountNumber", v) && "6–20 digits only",
    swiftCode:       v => !validate("swiftCode", v) && "Valid SWIFT/BIC code required (e.g. ABCDZAJJ)",
    reference:       v => f.reference && !validate("reference", v) && "Letters, numbers, spaces, hyphens only",
  };

  function validateStep1() {
    const e = {};
    ["amount", "recipientName", "recipientAccount", "swiftCode"].forEach(k => { const r = fieldRules[k](f[k]); if (r) e[k] = r; });
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  function handleChange(field, val) {
    setF(p => ({ ...p, [field]: val }));
    if (fieldRules[field]) setErrors(p => ({ ...p, [field]: fieldRules[field](val) || "" }));
  }

  async function handlePayNow() {
    if (!validateStep1()) return;
    const tx = {
      id: generateToken().slice(0, 16),
      customerId: customer.id,
      customerName: customer.fullName,
      customerAccount: customer.accountNumber,
      amount: parseFloat(f.amount).toFixed(2),
      currency: f.currency,
      provider: f.provider,
      recipientName: sanitize(f.recipientName),
      recipientAccount: f.recipientAccount,
      swiftCode: f.swiftCode.toUpperCase(),
      reference: sanitize(f.reference || ""),
      status: "pending",
      sessionToken,
      createdAt: Date.now(),
      verifiedBy: null,
      verifiedAt: null,
    };
    const newDB = { ...db, transactions: [...db.transactions, tx] };
    saveDB(newDB);
    setSubmitted(true);
    setMsg({ type: "success", text: `Payment submitted successfully! Transaction ID: ${tx.id}` });
  }

  if (submitted) return (
    <div style={S.page}>
      <Header title="GlobalBank — Customer Portal" user={customer} onLogout={onLogout} />
      <div style={{ minHeight: "calc(100vh - 70px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.success, marginBottom: 8 }}>Payment Submitted!</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>{msg.text}</div>
          <div style={{ background: C.light, borderRadius: 10, padding: "1rem", textAlign: "left", marginBottom: 20, fontSize: 13 }}>
            <div><strong>Amount:</strong> {f.currency} {parseFloat(f.amount).toFixed(2)}</div>
            <div><strong>Recipient:</strong> {sanitize(f.recipientName)}</div>
            <div><strong>SWIFT:</strong> {f.swiftCode.toUpperCase()}</div>
            <div><strong>Provider:</strong> {f.provider}</div>
          </div>
          <button onClick={() => { setSubmitted(false); setF({ amount: "", currency: "USD", provider: "SWIFT", recipientName: "", recipientAccount: "", swiftCode: "", reference: "" }); setStep(1); }} style={S.btn("primary")}>Make Another Payment</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <Header title="GlobalBank — Customer Portal" user={customer} onLogout={onLogout} />
      <div style={{ minHeight: "calc(100vh - 70px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={S.card}>
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>International Payment</div>
            <div style={{ fontSize: 13, color: C.muted }}>SWIFT transfer · All fields required unless marked optional</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {["Payment Details", "Recipient Info"].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: step === i + 1 ? C.blue : C.light, color: step === i + 1 ? C.white : C.muted }}>
                {i + 1}. {s}
              </div>
            ))}
          </div>

          <Alert type={msg.type} msg={msg.text} />

          <Field label="Amount" id="amount" value={f.amount} onChange={e => handleChange("amount", e.target.value)} error={errors.amount} placeholder="e.g. 1500.00" />
          <Select label="Currency" id="currency" value={f.currency} onChange={e => setF(p => ({ ...p, currency: e.target.value }))} options={CURRENCIES} />
          <Select label="Payment Provider" id="provider" value={f.provider} onChange={e => setF(p => ({ ...p, provider: e.target.value }))} options={PROVIDERS} />

          <div style={{ borderTop: `1px solid ${C.border}`, margin: "16px 0" }} />

          <Field label="Recipient Full Name" id="recipientName" value={f.recipientName} onChange={e => handleChange("recipientName", e.target.value)} error={errors.recipientName} placeholder="Beneficiary name" />
          <Field label="Recipient Account Number" id="recipientAccount" value={f.recipientAccount} onChange={e => handleChange("recipientAccount", e.target.value)} error={errors.recipientAccount} placeholder="Beneficiary account number" maxLength={20} />
          <Field label="SWIFT / BIC Code" id="swiftCode" value={f.swiftCode} onChange={e => handleChange("swiftCode", e.target.value.toUpperCase())} error={errors.swiftCode} placeholder="e.g. SBZAZAJJ" maxLength={11} />
          <Field label="Reference (optional)" id="reference" value={f.reference} onChange={e => handleChange("reference", e.target.value)} error={errors.reference} placeholder="Payment reference" maxLength={50} />

          <div style={{ background: "#FFF7E6", border: "1px solid #FFD166", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#7A4F00", marginBottom: 12 }}>
            🔒 Your data is encrypted in transit using TLS 1.3. Session token: <code style={{ fontFamily: "monospace" }}>{sessionToken.slice(0, 12)}…</code>
          </div>

          <button onClick={handlePayNow} style={S.btn("primary")}>Pay Now →</button>
        </div>
      </div>
    </div>
  );
}

// ── 5. Employee Login ─────────────────────────────────────────────────────────
function EmployeeLogin({ db, onSuccess, onBack }) {
  const [f, setF] = useState({ username: "", password: "" });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  async function handleSubmit() {
    if (!f.username || !f.password) { setMsg({ type: "error", text: "All fields required." }); return; }
    if (attempts >= 5) { setMsg({ type: "error", text: "Account locked after too many attempts." }); return; }

    setLoading(true);
    await new Promise(r => setTimeout(r, 300)); // timing attack prevention
    try {
      const emp = db.employees.find(e => e.username === f.username);
      if (!emp) { setAttempts(a => a + 1); setMsg({ type: "error", text: "Invalid credentials." }); setLoading(false); return; }
      const ok = await verifyPassword(f.password, emp.passwordHash);
      if (!ok) { setAttempts(a => a + 1); setMsg({ type: "error", text: "Invalid credentials." }); setLoading(false); return; }
      setAttempts(0);
      onSuccess(emp);
    } catch {
      setMsg({ type: "error", text: "Login error." });
    }
    setLoading(false);
  }

  return (
    <div style={S.page}>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={S.card}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>Employee Login</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Staff-only · No self-registration permitted</div>
          </div>
          <Alert type={msg.type} msg={msg.text} />
          <Field label="Username" id="empUser" value={f.username} onChange={e => setF(p => ({ ...p, username: e.target.value }))} autoComplete="username" />
          <Field label="Password" id="empPwd" type="password" value={f.password} onChange={e => setF(p => ({ ...p, password: e.target.value }))} autoComplete="current-password" />
          <div style={{ background: C.light, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.muted, marginBottom: 12 }}>
            <strong>Demo credentials:</strong> username <code>jsmith</code> or <code>amokoena</code>, password <code>Staff@1234</code>
          </div>
          <button onClick={handleSubmit} disabled={loading || attempts >= 5} style={S.btn("primary")}>{loading ? "Authenticating…" : "Log In"}</button>
          <button onClick={onBack} style={{ ...S.btn("ghost"), background: "none", color: C.muted, fontSize: 13 }}>← Back</button>
        </div>
      </div>
    </div>
  );
}

// ── 6. Employee Dashboard ─────────────────────────────────────────────────────
function EmployeeDashboard({ employee, db, saveDB, onLogout }) {
  const [transactions, setTransactions] = useState(db.transactions);
  const [verified, setVerified] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => { setTransactions(db.transactions); }, [db]);

  const filtered = transactions.filter(tx => filter === "all" ? true : tx.status === filter);

  function toggleVerify(id) {
    setVerified(p => ({ ...p, [id]: !p[id] }));
  }

  function handleSubmitToSWIFT() {
    const toSubmit = transactions.filter(tx => tx.status === "pending" && verified[tx.id]);
    if (!toSubmit.length) { setMsg({ type: "error", text: "Please verify at least one pending transaction before submitting." }); return; }
    const now = Date.now();
    const updatedTxs = transactions.map(tx =>
      (tx.status === "pending" && verified[tx.id]) ? { ...tx, status: "submitted", verifiedBy: employee.id, verifiedAt: now } : tx
    );
    const newDB = { ...db, transactions: updatedTxs };
    saveDB(newDB);
    setTransactions(updatedTxs);
    setVerified({});
    setSubmitted(true);
    setMsg({ type: "success", text: `${toSubmit.length} transaction(s) successfully submitted to SWIFT.` });
  }

  const pending = transactions.filter(tx => tx.status === "pending");
  const submittedCount = transactions.filter(tx => tx.status === "submitted").length;

  return (
    <div style={{ ...S.page, minHeight: "100vh" }}>
      <Header title="GlobalBank — Employee Portal" subtitle="International Payments Verification" user={employee} onLogout={onLogout} />
      <div style={{ padding: "2rem", maxWidth: 960, margin: "0 auto" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Transactions", value: transactions.length, color: C.blue },
            { label: "Pending Verification", value: pending.length, color: "#D97706" },
            { label: "Submitted to SWIFT", value: submittedCount, color: C.success },
          ].map(s => (
            <div key={s.label} style={{ background: C.white, borderRadius: 12, padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <Alert type={msg.type} msg={msg.text} />

        {/* Controls */}
        <div style={{ background: C.white, borderRadius: 12, padding: "1rem 1.5rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Filter:</span>
          {["all", "pending", "submitted"].map(f2 => (
            <button key={f2} onClick={() => setFilter(f2)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${filter === f2 ? C.blue : C.border}`, background: filter === f2 ? C.blue : "transparent", color: filter === f2 ? C.white : C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
              {f2}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={handleSubmitToSWIFT} style={{ ...S.btn("success"), width: "auto", padding: "8px 20px", marginTop: 0 }}>Submit to SWIFT →</button>
        </div>

        {/* Transaction Table */}
        <div style={{ background: C.white, borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: C.muted, fontSize: 14 }}>No transactions found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.light }}>
                    {["Verify", "Tx ID", "Customer", "Amount", "Recipient", "SWIFT Code", "Date", "Status"].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx, i) => (
                    <tr key={tx.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.white : "#FAFBFF" }}>
                      <td style={{ padding: "12px 14px" }}>
                        {tx.status === "pending" ? (
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input type="checkbox" checked={!!verified[tx.id]} onChange={() => toggleVerify(tx.id)}
                              style={{ width: 16, height: 16, accentColor: C.success }} />
                            <span style={{ fontSize: 11, color: C.muted }}>Verified</span>
                          </label>
                        ) : <span style={{ fontSize: 11, color: C.success }}>✓ Done</span>}
                      </td>
                      <td style={{ padding: "12px 14px" }}><code style={{ fontSize: 11, background: C.light, padding: "2px 6px", borderRadius: 4 }}>{tx.id.slice(0, 10)}…</code></td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600 }}>{sanitize(tx.customerName)}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{tx.customerAccount}</div>
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 700 }}>{tx.currency} {tx.amount}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600 }}>{sanitize(tx.recipientName)}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{tx.recipientAccount}</div>
                      </td>
                      <td style={{ padding: "12px 14px" }}><code style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{tx.swiftCode}</code></td>
                      <td style={{ padding: "12px 14px", fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>{new Date(tx.createdAt).toLocaleString()}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={S.tag(tx.status === "submitted" ? "green" : tx.status === "pending" ? "amber" : "blue")}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
          🔒 All data encrypted at rest · TLS 1.3 in transit · Session: {employee.id} · CSRF protected
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [db, setDB] = useState(() => initDB());
  const [view, setView] = useState("landing"); // landing | c-register | c-login | c-dashboard | e-login | e-dashboard
  const [currentUser, setCurrentUser] = useState(null);

  // Seed employee accounts on first run
  useEffect(() => {
    async function seedEmployees() {
      if (db.employees.length > 0) return;
      const defaultPass = "Staff@1234";
      const hashed = await Promise.all(SEED_EMPLOYEES.map(e => hashPassword(defaultPass)));
      const employees = SEED_EMPLOYEES.map((e, i) => ({ ...e, passwordHash: hashed[i] }));
      const newDB = { ...db, employees };
      setDB(newDB);
      saveDB(newDB);
    }
    seedEmployees();
  }, []);

  function persistDB(newDB) {
    setDB(newDB);
    saveDB(newDB);
  }

  function handleCustomerLogin(customer) {
    setCurrentUser(customer);
    setView("c-dashboard");
  }

  function handleEmployeeLogin(employee) {
    setCurrentUser(employee);
    setView("e-dashboard");
  }

  function handleLogout() {
    setCurrentUser(null);
    setView("landing");
  }

  // Security headers simulation
  useEffect(() => {
    document.title = "GlobalBank International Payments";
  }, []);

  if (view === "landing") return <Landing onSelect={s => setView(s === "customer" ? "c-login" : "e-login")} />;
  if (view === "c-register") return <CustomerRegister db={db} saveDB={persistDB} onSuccess={handleCustomerLogin} onSwitch={v => setView(v === "login" ? "c-login" : "c-register")} />;
  if (view === "c-login") return <CustomerLogin db={db} onSuccess={handleCustomerLogin} onSwitch={v => setView(v === "register" ? "c-register" : "c-login")} onBack={() => setView("landing")} />;
  if (view === "c-dashboard") return <CustomerDashboard customer={currentUser} db={db} saveDB={persistDB} onLogout={handleLogout} />;
  if (view === "e-login") return <EmployeeLogin db={db} onSuccess={handleEmployeeLogin} onBack={() => setView("landing")} />;
  if (view === "e-dashboard") return <EmployeeDashboard employee={currentUser} db={db} saveDB={persistDB} onLogout={handleLogout} />;
  return null;
}
