import { OAuth2Client } from "google-auth-library";
import config from "../helpers/systemConfig.helper.js";

let client;

export const getGoogleClient = () => {
  if (!client) {
    client = new OAuth2Client(config.get("GOOGLE_CLIENT_ID"));
  }
  return client;
};
