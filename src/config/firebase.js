import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

// Get directory path (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Full path of JSON key file
const serviceAccountPath = path.join(__dirname, "../../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

console.log("🔥 Firebase Admin Initialized Successfully");

export default admin;
