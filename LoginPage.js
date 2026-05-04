import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { validateLogin } from "../utils/validation";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", accountNumber: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = validateLogin(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const user = await login(form);
      navigate(user.role === "employee" ? "/portal" : "/payment");
    } catch (err) {
      // Generic error message — same for wrong username or wrong password (prevents enumeration)
      setServerError("Invalid credentials. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="card">
        <div className="card-header">
          <div className="bank-logo">🏦</div>
          <h1>Welcome Back</h1>
          <p className="subtitle">International Payments Portal</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {serverError && <div className="alert alert-error">{serverError}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username" name="username" type="text"
              placeholder="Your username"
              value={form.username} onChange={handleChange}
              className={fieldErrors.username ? "input-error" : ""}
              autoComplete="username"
              required
            />
            {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="accountNumber">Account Number</label>
            <input
              id="accountNumber" name="accountNumber" type="text"
              placeholder="Your bank account number"
              value={form.accountNumber} onChange={handleChange}
              className={fieldErrors.accountNumber ? "input-error" : ""}
              maxLength={16}
              required
            />
            {fieldErrors.accountNumber && <span className="field-error">{fieldErrors.accountNumber}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password"
              placeholder="Your password"
              value={form.password} onChange={handleChange}
              className={fieldErrors.password ? "input-error" : ""}
              autoComplete="current-password"
              required
            />
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Logging in…" : "Log In"}
          </button>

          <p className="form-footer">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
