import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

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
  // Validate Firebase config in browser
  const requiredFields = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];
  const missingFields = requiredFields.filter(
    (field) => !firebaseConfig[field as keyof typeof firebaseConfig]
  );

  if (missingFields.length > 0) {
    console.error(
      `❌ Firebase configuration is missing required fields: ${missingFields.join(", ")}`
    );
    console.error("Current config:", {
      apiKey: firebaseConfig.apiKey ? "✓" : "✗",
      authDomain: firebaseConfig.authDomain ? "✓" : "✗",
      projectId: firebaseConfig.projectId ? "✓" : "✗",
      storageBucket: firebaseConfig.storageBucket ? "✓" : "✗",
      messagingSenderId: firebaseConfig.messagingSenderId ? "✓" : "✗",
      appId: firebaseConfig.appId ? "✓" : "✗",
    });
    throw new Error(
      `Firebase configuration is incomplete. Missing: ${missingFields.join(", ")}`
    );
  }

  console.log("✓ Firebase config validation passed");
  console.log("Firebase config:", {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 20)}...` : "missing",
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
  });

  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("✓ Firebase app initialized successfully");
    } catch (initError) {
      console.error("❌ Firebase initialization error:", initError);
      throw initError;
    }
  } else {
    app = getApps()[0];
    console.log("✓ Using existing Firebase app instance");
  }
  
  try {
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("✓ Firebase Auth and Firestore initialized");
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
