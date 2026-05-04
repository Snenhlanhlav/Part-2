import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { validateRegistration } from "../utils/validation";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "", idNumber: "", accountNumber: "", username: "", password: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear individual field error on change
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    // Client-side whitelist validation
    const errors = validateRegistration(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await API.post("/auth/register", form);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.join(", ") || "Registration failed.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="card">
        <div className="card-header">
          <div className="bank-logo">🏦</div>
          <h1>Create Account</h1>
          <p className="subtitle">International Payments Portal</p>
        </div>

        {success ? (
          <div className="alert alert-success">
            ✅ Account created successfully! Redirecting to login…
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {serverError && <div className="alert alert-error">{serverError}</div>}

            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName" name="fullName" type="text"
                placeholder="Jane Doe"
                value={form.fullName} onChange={handleChange}
                className={fieldErrors.fullName ? "input-error" : ""}
                autoComplete="name"
                required
              />
              {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="idNumber">ID Number</label>
              <input
                id="idNumber" name="idNumber" type="text"
                placeholder="13-digit SA ID number"
                value={form.idNumber} onChange={handleChange}
                className={fieldErrors.idNumber ? "input-error" : ""}
                maxLength={13}
                required
              />
              {fieldErrors.idNumber && <span className="field-error">{fieldErrors.idNumber}</span>}
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
              <label htmlFor="username">Username</label>
              <input
                id="username" name="username" type="text"
                placeholder="Choose a username"
                value={form.username} onChange={handleChange}
                className={fieldErrors.username ? "input-error" : ""}
                autoComplete="username"
                required
              />
              {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password" name="password" type="password"
                placeholder="Min 8 chars with upper, lower, number, special"
                value={form.password} onChange={handleChange}
                className={fieldErrors.password ? "input-error" : ""}
                autoComplete="new-password"
                required
              />
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating Account…" : "Register"}
            </button>

            <p className="form-footer">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
