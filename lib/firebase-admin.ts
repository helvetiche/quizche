import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { env } from "./env";

let app: App;

if (!getApps().length) {
  let serviceAccount;

  if (env.FIREBASE_SERVICE_ACCOUNT_KEY && env.FIREBASE_SERVICE_ACCOUNT_KEY.length > 0) {
    serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } else {
    const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");

    serviceAccount = {
      type: env.FIREBASE_ADMIN_TYPE,
      project_id: env.FIREBASE_ADMIN_PROJECT_ID,
      private_key_id: env.FIREBASE_ADMIN_PRIVATE_KEY_ID || undefined,
      private_key: privateKey,
      client_email: env.FIREBASE_ADMIN_CLIENT_EMAIL,
      client_id: env.FIREBASE_ADMIN_CLIENT_ID || undefined,
      auth_uri: env.FIREBASE_ADMIN_AUTH_URI,
      token_uri: env.FIREBASE_ADMIN_TOKEN_URI,
      auth_provider_x509_cert_url: env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL || undefined,
      client_x509_cert_url: env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL || undefined,
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
