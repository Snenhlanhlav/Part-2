import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import { useAuth } from "../utils/AuthContext";
import { validatePayment, CURRENCIES, PROVIDERS } from "../utils/validation";

export default function PaymentPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [form, setForm] = useState({
    amount: "",
    currency: "ZAR",
    provider: "SWIFT",
    payeeAccountNumber: "",
    swiftCode: "",
    payeeName: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = validatePayment(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await API.post("/payments", {
        ...form,
        swiftCode: form.swiftCode.toUpperCase(),
      });
      setSuccess(true);
      setForm({ amount: "", currency: "ZAR", provider: "SWIFT", payeeAccountNumber: "", swiftCode: "", payeeName: "" });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.join(", ") || "Payment submission failed.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="page-wrapper">
      <div className="card wide-card">
        <div className="card-header">
          <div className="header-row">
            <div>
              <div className="bank-logo">🏦</div>
              <h1>International Payment</h1>
              <p className="subtitle">Welcome, {user?.username}</p>
            </div>
            <button className="btn-logout" onClick={handleLogout}>Log Out</button>
          </div>
        </div>

        {success && (
          <div className="alert alert-success">
            ✅ Payment submitted successfully! It is now pending review by our team.
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {serverError && <div className="alert alert-error">{serverError}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="amount">Amount</label>
              <input
                id="amount" name="amount" type="text"
                placeholder="e.g. 5000.00"
                value={form.amount} onChange={handleChange}
                className={fieldErrors.amount ? "input-error" : ""}
                required
              />
              {fieldErrors.amount && <span className="field-error">{fieldErrors.amount}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="currency">Currency</label>
              <select id="currency" name="currency" value={form.currency} onChange={handleChange}
                className={fieldErrors.currency ? "input-error" : ""}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {fieldErrors.currency && <span className="field-error">{fieldErrors.currency}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="provider">Payment Provider</label>
              <select id="provider" name="provider" value={form.provider} onChange={handleChange}
                className={fieldErrors.provider ? "input-error" : ""}>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {fieldErrors.provider && <span className="field-error">{fieldErrors.provider}</span>}
            </div>
          </div>

          <div className="section-divider">
            <span>Payee Details</span>
          </div>

          <div className="form-group">
            <label htmlFor="payeeName">Payee Name</label>
            <input
              id="payeeName" name="payeeName" type="text"
              placeholder="Full name of recipient"
              value={form.payeeName} onChange={handleChange}
              className={fieldErrors.payeeName ? "input-error" : ""}
              required
            />
            {fieldErrors.payeeName && <span className="field-error">{fieldErrors.payeeName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="payeeAccountNumber">Payee Account Number</label>
              <input
                id="payeeAccountNumber" name="payeeAccountNumber" type="text"
                placeholder="Recipient's account / IBAN"
                value={form.payeeAccountNumber} onChange={handleChange}
                className={fieldErrors.payeeAccountNumber ? "input-error" : ""}
                maxLength={34}
                required
              />
              {fieldErrors.payeeAccountNumber && <span className="field-error">{fieldErrors.payeeAccountNumber}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="swiftCode">SWIFT / BIC Code</label>
              <input
                id="swiftCode" name="swiftCode" type="text"
                placeholder="e.g. ABCDUS33XXX"
                value={form.swiftCode} onChange={handleChange}
                className={fieldErrors.swiftCode ? "input-error" : ""}
                maxLength={11}
                required
              />
              {fieldErrors.swiftCode && <span className="field-error">{fieldErrors.swiftCode}</span>}
            </div>
          </div>

          <button type="submit" className="btn-primary btn-pay" disabled={loading}>
            {loading ? "Processing…" : "💸 Pay Now"}
          </button>
        </form>
      </div>
    </div>
  );
}
