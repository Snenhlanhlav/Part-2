# SecureBank — International Payments Portal

Full-stack secure web application for international SWIFT payments.  
**Stack:** React · Node.js · Express · MongoDB · HTTPS · JWT · CircleCI · SonarQube

---

## Project Structure

```
secure-payments/
├── backend/                  # Express API (HTTPS)
│   ├── certs/                # SSL key + cert (self-signed for dev)
│   ├── config/db.js          # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js           # JWT protect + restrictTo
│   │   └── validate.js       # RegEx whitelist validation
│   ├── models/
│   │   ├── Customer.js       # bcrypt hashed password
│   │   ├── Employee.js       # bcrypt hashed password (seed-only)
│   │   └── Transaction.js    # IBAN + SWIFT validation
│   ├── routes/
│   │   ├── customerAuth.js   # POST /register, /login
│   │   ├── employeeAuth.js   # POST /login (no register)
│   │   └── transactions.js   # Full CRUD with role guards
│   ├── scripts/
│   │   └── seedEmployees.js  # Pre-creates employee accounts
│   ├── server.js             # HTTPS server + security middleware
│   └── .env.example
├── frontend/                 # React app
│   └── src/
│       ├── context/AuthContext.js
│       ├── pages/
│       │   ├── customer/     # Register · Login · PaymentForm
│       │   └── employee/     # EmployeeLogin · EmployeePortal
│       └── utils/
│           ├── api.js        # Axios with JWT interceptor
│           └── validation.js # Mirrored RegEx patterns
├── .circleci/config.yml      # CI/CD pipeline
└── sonar-project.properties  # SonarQube config
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`)
- OpenSSL (for SSL cert generation)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/secure-payments.git
cd secure-payments

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env — set a strong JWT_SECRET (32+ random chars)
```

### 3. Generate SSL Certificate (dev only)

```bash
cd backend
openssl req -x509 -newkey rsa:2048 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -days 365 -nodes \
  -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=SecureBank/CN=localhost"
```

### 4. Seed Employee Accounts

```bash
cd backend
npm run seed
# Creates: alice.mokoena/EMP00001, brian.dlamini/EMP00002, carla.vdmerwe/EMP00003
# Default password: Secure@Pass1 (change in scripts/seedEmployees.js before production)
```

### 5. Start Backend

```bash
cd backend
npm run dev
# API running at https://localhost:5000
```

### 6. Start Frontend

```bash
cd frontend
npm start
# UI running at http://localhost:3000
```

> **Note:** Because the backend uses a self-signed cert, your browser will show a security warning.  
> Visit `https://localhost:5000/api/health` and click "Accept Risk" before using the app.

---

## User Flows

### Customer
1. Register at `/customer/register` (fullName, ID number, account number, username, password)
2. Login at `/customer/login` (username, account number, password)
3. Submit payment at `/customer/payment` (amount, currency, IBAN, SWIFT code, recipient)

### Employee
1. Login at `/employee/login` (username, employeeId, password)  
   ⚠️ **No registration page exists — employees are seeded only**
2. View pending transactions on `/employee/portal`
3. Click **✔ Verified** on each transaction after checking SWIFT details
4. Click **✈️ Submit to SWIFT** to finalise all verified transactions

---

## Security Features

| Attack | Mitigation |
|---|---|
| **SQL/NoSQL Injection** | `express-mongo-sanitize` strips `$` and `.` operators; Mongoose typed schemas |
| **XSS** | `xss-clean` middleware; Helmet CSP headers; React escapes output by default |
| **Clickjacking** | `X-Frame-Options: DENY` via Helmet `frameguard` |
| **Session Jacking** | Short-lived JWT (1h); Bearer token in Authorization header (not cookies); HTTPS-only |
| **MITM** | All traffic over HTTPS/TLS; HSTS header enforced |
| **DDoS / Brute Force** | `express-rate-limit`: 200 req/15min global; 10 req/15min on auth endpoints |
| **CSRF** | JWT in Authorization header (not cookies); CORS restricted to `localhost:3000` |
| **Weak Passwords** | bcrypt 12 rounds (hash+salt); strict RegEx enforces complexity |
| **Input Tampering** | RegEx whitelist on ALL fields, both client and server |
| **Role Escalation** | `restrictTo('employee')` middleware on portal routes; role embedded in JWT |

---

## API Endpoints

### Customer Auth
```
POST  /api/auth/customer/register   { fullName, idNumber, accountNumber, username, password }
POST  /api/auth/customer/login      { username, accountNumber, password }
```

### Employee Auth
```
POST  /api/auth/employee/login      { username, employeeId, password }
```

### Transactions
```
POST  /api/transactions             [customer] Create payment
GET   /api/transactions/my          [customer] My transactions
GET   /api/transactions             [employee] All pending/verified
PATCH /api/transactions/:id/verify  [employee] Verify one transaction
POST  /api/transactions/submit-to-swift  [employee] Submit all verified
```

---

## CI/CD — CircleCI + SonarQube

### Setup Steps
1. Push repo to GitHub
2. Connect repo to [CircleCI](https://circleci.com)
3. Create a **SonarCloud** project at [sonarcloud.io](https://sonarcloud.io)
4. Add `SONAR_TOKEN` to a CircleCI context named `SonarCloud`
5. Every push triggers: Install → Build → Test → SonarQube Scan

### SonarQube Checks
- Security Hotspots (hardcoded secrets, weak crypto, injection risks)
- Code Smells (maintainability)
- Bugs and Vulnerabilities
- Coverage reporting

---

## Employee Seed Credentials (Dev Only)

| Username | Employee ID | Password |
|---|---|---|
| alice.mokoena | EMP00001 | Secure@Pass1 |
| brian.dlamini | EMP00002 | Secure@Pass2 |
| carla.vdmerwe | EMP00003 | Secure@Pass3 |

> Change all passwords before any production deployment.
