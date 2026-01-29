/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (typeof window !== "undefined") {
  const requiredFields = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];
  const missingFields = requiredFields.filter((field) => {
    const value = firebaseConfig[field as keyof typeof firebaseConfig];
    return value === undefined || value === null || value === "";
  });

  if (missingFields.length > 0) {
    console.error(
      `❌ Firebase configuration is missing required fields: ${missingFields.join(", ")}`
    );
    console.error("Current config:", {
      apiKey:
        firebaseConfig.apiKey !== null &&
        firebaseConfig.apiKey !== undefined &&
        firebaseConfig.apiKey !== ""
          ? "✓"
          : "✗",
      authDomain:
        firebaseConfig.authDomain !== null &&
        firebaseConfig.authDomain !== undefined &&
        firebaseConfig.authDomain !== ""
          ? "✓"
          : "✗",
      projectId:
        firebaseConfig.projectId !== null &&
        firebaseConfig.projectId !== undefined &&
        firebaseConfig.projectId !== ""
          ? "✓"
          : "✗",
      storageBucket:
        firebaseConfig.storageBucket !== null &&
        firebaseConfig.storageBucket !== undefined &&
        firebaseConfig.storageBucket !== ""
          ? "✓"
          : "✗",
      messagingSenderId:
        firebaseConfig.messagingSenderId !== null &&
        firebaseConfig.messagingSenderId !== undefined &&
        firebaseConfig.messagingSenderId !== ""
          ? "✓"
          : "✗",
      appId:
        firebaseConfig.appId !== null &&
        firebaseConfig.appId !== undefined &&
        firebaseConfig.appId !== ""
          ? "✓"
          : "✗",
    });
    throw new Error(
      `Firebase configuration is incomplete. Missing: ${missingFields.join(", ")}`
    );
  }

  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (initError) {
      console.error("❌ Firebase initialization error:", initError);
      throw initError;
    }
  } else {
    app = getApps()[0];
  }

  try {
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (authError) {
    console.error("❌ Firebase Auth initialization error:", authError);
    throw authError;
  }
} else {
  // Server-side: create dummy instances (won't be used)
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
}

export { auth, db };
export default app;
