import "dotenv/config";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const getServiceAccount = () => {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return {
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(process.cwd(), "serviceAccountKey.json");

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      `Firebase credentials not found. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY, or provide FIREBASE_SERVICE_ACCOUNT_PATH. Checked: ${serviceAccountPath}`
    );
  }

  return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
};

const serviceAccount = getServiceAccount();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

console.log("Firebase Admin Initialized | Project:", serviceAccount.project_id || serviceAccount.projectId);

export default admin;
