export function otpMessageTemplate(appName, otp, userType = "passenger") {
  const userLabel =
    userType === "driver"
      ? "Captain"
      : userType === "admin"
      ? "Admin"
      : "Passenger";

  return `
──────────────────────────────
🚗 ${appName} ${userLabel} Verification
──────────────────────────────

🪄 Your One-Time Password (OTP):

          🔹 ${otp} 🔹

⏳ Valid for 5 minutes only.
⚠️ Do not share this code with anyone.

Thank you for choosing ${appName} 💫
──────────────────────────────
`;
}
