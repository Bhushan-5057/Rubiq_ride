import axios from "axios";

const MSG91_SEND_OTP_URL = "https://control.msg91.com/api/v5/otp";

const formatMobileForMsg91 = (contactNumber) =>
  String(contactNumber).replace(/\D/g, "");

const hasUsableMsg91Config = (authKey, templateId) =>
  Boolean(authKey) &&
  Boolean(templateId) &&
  templateId !== "your_template_id";

export const sendOtpViaMsg91 = async ({ contactNumber, otp }) => {
  const { MSG91_AUTH_KEY, MSG91_TEMPLATE_ID } = process.env;

  if (!hasUsableMsg91Config(MSG91_AUTH_KEY, MSG91_TEMPLATE_ID)) {
    console.warn(
      "[MSG91] SMS sending bypassed. Add verified MSG91_AUTH_KEY and MSG91_TEMPLATE_ID after DLT approval."
    );

    return {
      type: "bypassed",
      message: "MSG91 sending bypassed until DLT template is verified",
    };
  }

  const mobile = formatMobileForMsg91(contactNumber);

  /*
   * MSG91 live send call. Keep this enabled after DLT template approval.
   * If you need to temporarily disable MSG91 even with valid credentials,
   * return the bypass response above before this request.
   */
  const response = await axios.post(
    MSG91_SEND_OTP_URL,
    {},
    {
      params: {
        authkey: MSG91_AUTH_KEY,
        template_id: MSG91_TEMPLATE_ID,
        mobile,
        otp,
      },
      timeout: 10000,
    }
  );

  if (response.data?.type && response.data.type !== "success") {
    throw new Error(response.data.message || "MSG91 failed to send OTP");
  }

  return response.data;
};
