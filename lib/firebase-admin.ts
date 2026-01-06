import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App;

if (!getApps().length) {
  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } else {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

    if (
      !process.env.FIREBASE_ADMIN_PROJECT_ID ||
      !privateKey ||
      !process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    ) {
      throw new Error(
        "Firebase Admin configuration is incomplete. Please set either FIREBASE_SERVICE_ACCOUNT_KEY or all FIREBASE_ADMIN_* environment variables."
      );
    }

    serviceAccount = {
      type: process.env.FIREBASE_ADMIN_TYPE || "service_account",
      project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
      private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
      auth_uri:
        process.env.FIREBASE_ADMIN_AUTH_URI ||
        "https://accounts.google.com/o/oauth2/auth",
      token_uri:
        process.env.FIREBASE_ADMIN_TOKEN_URI ||
        "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url:
        process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL ||
        "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL,
    };
  }

  app = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  app = getApps()[0];
}

const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

export { adminAuth, adminDb };
export default app;
