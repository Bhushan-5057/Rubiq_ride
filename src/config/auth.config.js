import "dotenv/config";

const ENABLE_TEST_OTP_ENV = "ENABLE_TEST_OTP";
const BOOLEAN_ENV_VALUES = {
  true: true,
  false: false,
};

function parseBooleanEnv(envName, defaultValue = false) {
  const rawValue = process.env[envName];

  if (rawValue === undefined || rawValue === "") {
    return defaultValue;
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (!(normalizedValue in BOOLEAN_ENV_VALUES)) {
    throw new Error(`${envName} must be set to true or false`);
  }

  return BOOLEAN_ENV_VALUES[normalizedValue];
}

export function isTestOtpEnabled() {
  return parseBooleanEnv(ENABLE_TEST_OTP_ENV, false);
}

export const authConfig = {
  enableTestOtp: isTestOtpEnabled,
};
