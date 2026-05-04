/**
 * Client-side RegEx whitelist validation.
 * These mirror the server-side patterns in User.js / Payment.js.
 * Client-side validation is for UX only — the server re-validates everything.
 */

export const REGEX = {
  fullName: /^[a-zA-Z\s'-]{2,100}$/,
  idNumber: /^\d{13}$/,
  accountNumber: /^\d{8,16}$/,
  username: /^[a-zA-Z0-9_.-]{3,30}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  amount: /^\d+(\.\d{1,2})?$/,
  payeeAccount: /^\d{8,34}$/,
  swiftCode: /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i,
  payeeName: /^[a-zA-Z\s'-]{2,100}$/,
};

export const CURRENCIES = ["USD", "EUR", "GBP", "ZAR", "JPY", "AUD", "CAD", "CHF"];
export const PROVIDERS = ["SWIFT"];

export function validateRegistration({ fullName, idNumber, accountNumber, username, password }) {
  const errors = {};
  if (!REGEX.fullName.test(fullName))
    errors.fullName = "Letters, spaces, hyphens and apostrophes only (2–100 chars).";
  if (!REGEX.idNumber.test(idNumber))
    errors.idNumber = "Must be exactly 13 digits.";
  if (!REGEX.accountNumber.test(accountNumber))
    errors.accountNumber = "Must be 8–16 digits.";
  if (!REGEX.username.test(username))
    errors.username = "3–30 characters: letters, numbers, _ . -";
  if (!REGEX.password.test(password))
    errors.password = "Min 8 chars with uppercase, lowercase, number and special character (@$!%*?&).";
  return errors;
}

export function validateLogin({ username, accountNumber, password }) {
  const errors = {};
  if (!REGEX.username.test(username)) errors.username = "Invalid username format.";
  if (!REGEX.accountNumber.test(accountNumber)) errors.accountNumber = "Must be 8–16 digits.";
  if (!password || password.length < 1) errors.password = "Password is required.";
  return errors;
}

export function validatePayment({ amount, currency, provider, payeeAccountNumber, swiftCode, payeeName }) {
  const errors = {};
  if (!REGEX.amount.test(amount)) errors.amount = "Enter a valid positive amount (e.g. 1000.00).";
  if (!CURRENCIES.includes(currency)) errors.currency = "Select a valid currency.";
  if (!PROVIDERS.includes(provider)) errors.provider = "Select a valid provider.";
  if (!REGEX.payeeAccount.test(payeeAccountNumber)) errors.payeeAccountNumber = "Must be 8–34 digits.";
  if (!REGEX.swiftCode.test(swiftCode.toUpperCase())) errors.swiftCode = "Invalid SWIFT/BIC code (e.g. ABCDUS33 or ABCDUS33XXX).";
  if (!REGEX.payeeName.test(payeeName)) errors.payeeName = "Letters, spaces, hyphens and apostrophes only.";
  return errors;
}
