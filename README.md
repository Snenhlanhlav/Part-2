

A secure customer-facing international payment portal built with React (frontend) and Node.js/Express (backend).



## Security Features Implemented

| Attack / Requirement | Implementation |
|---|---|
| **Password hashing & salting** | `bcryptjs` with cost factor 12 — unique salt per user |
| **Input whitelisting (RegEx)** | All fields validated client-side AND server-side with strict RegEx |
| **HTTPS / SSL** | Node `https` module with TLS certificates; React served with `HTTPS=true` |
| **SQL / NoSQL Injection** | `express-mongo-sanitize` strips `$` and `.` operators; schema-level validation |
| **XSS** | `helmet` sets `X-XSS-Protection`, CSP headers; React escapes output by default |
| **Clickjacking** | `helmet` sets `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| **Session Jacking** | Short-lived JWT (1h); HTTPS-only transmission; generic error messages |
| **MITM** | HTTPS/TLS enforced; HSTS header set by `helmet` |
| **DDoS / Brute Force** | `express-rate-limit`: 100 req/15min globally; 10 req/15min on auth routes |
| **CORS** | Restricted to frontend origin only |
| **Body size limit** | `express.json({ limit: '10kb' })` |

---

## Project Structure

```
payment-portal/
├── backend/
│   ├── server.js            ← Express + all security middleware
│   ├── routes/
│   │   ├── auth.js          ← Register & Login routes
│   │   └── payments.js      ← Payment submission routes
│   ├── models/
│   │   ├── User.js          ← User schema with bcrypt pre-save hook
│   │   └── Payment.js       ← Payment schema with RegEx validators
│   ├── middleware/
│   │   └── auth.js          ← JWT verify + role-based access
│   ├── config/              ← Place key.pem and cert.pem here
│   ├── .env.example         ← Copy to .env and fill in values
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── RegisterPage.js
    │   │   ├── LoginPage.js
    │   │   └── PaymentPage.js
    │   ├── utils/
    │   │   ├── validation.js   ← Client-side RegEx whitelist
    │   │   ├── api.js          ← Axios instance with JWT interceptor
    │   │   └── AuthContext.js  ← Global auth state
    │   ├── App.js              ← Routes + protected route wrapper
    │   └── App.css
    └── package.json
```

---

## Setup & Running

### 1. Generate SSL Certificates (development)
```bash
mkdir -p backend/config
cd backend/config
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=BankDev/CN=localhost"
```

### 2. Configure Environment
```bash
cp backend/.env.example backend/.env
# Edit .env:
#   MONGO_URI=mongodb://localhost:27017/payment_portal
#   JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
```

### 3. Start Backend
```bash
cd backend
npm install
npm start
# → HTTPS server on https://localhost:5001
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm start
# → React on https://localhost:3000 (HTTPS=true in package.json)
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Customer registration |
| POST | `/api/auth/login` | None | Customer / employee login |
| POST | `/api/payments` | JWT (customer) | Submit a payment |
| GET | `/api/payments/my` | JWT (customer) | View own payments |

---

## Customer Flow
1. **Register** — `/register` — Provide full name, SA ID, account number, username, password
2. **Login** — `/login` — Provide username, account number, password → receive JWT
3. **Pay** — `/payment` — Enter amount, currency, provider, payee details, SWIFT code → Pay Now
4. Payment stored in DB with status `pending` — visible in employee portal (Task 3)
