import { OAuth2Client } from "google-auth-library";

let client;

export const getGoogleClient = () => {
  if (!client) {
    client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return client;
};
