"use client";

import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import GoogleIcon from "./ui/GoogleIcon";
import ErrorMessage from "./ui/ErrorMessage";

type GoogleAuthButtonProps = {
  onLoginSuccess?: (role: string | null, idToken: string) => void;
};

const GoogleAuthButton = ({ onLoginSuccess }: GoogleAuthButtonProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verify Firebase is initialized
      if (!auth) {
        throw new Error(
          "Firebase authentication is not initialized. Please check your Firebase configuration."
        );
      }

      const provider = new GoogleAuthProvider();
      // Add additional scopes if needed
      provider.addScope("email");
      provider.addScope("profile");

      console.log("Attempting Firebase sign-in with popup...");
      console.log("Firebase config check:", {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY
          ? "✓ Set"
          : "✗ Missing",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
          ? "✓ Set"
          : "✗ Missing",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
          ? "✓ Set"
          : "✗ Missing",
      });

      const result = await signInWithPopup(auth, provider);
      console.log("Firebase sign-in successful, getting ID token...");
      const idToken = await result.user.getIdToken();
      console.log("ID token obtained successfully");

      const { apiPost } = await import("../lib/api");
      const response = await apiPost("/api/auth/login", {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
        idToken: null, // No token yet for login
        requireCSRF: false, // Login doesn't require CSRF
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `Login failed with status ${response.status}`;
        console.error("Login API error:", errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const role = data.user?.role || null;

      if (onLoginSuccess) {
        onLoginSuccess(role, idToken);
      } else if (role) {
        router.push(`/${role}`);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      // Firebase Auth errors have a code property
      const firebaseError = err as {
        code?: string;
        message?: string;
        customData?: any;
      };
      const errorCode = firebaseError.code || "unknown";
      const errorMessage =
        firebaseError.message ||
        err?.message ||
        "Failed to sign in with Google";

      console.error("=== FIREBASE OAUTH ERROR ===");
      console.error("Error Code:", errorCode);
      console.error("Error Message:", errorMessage);
      console.error("Full Error Object:", err);
      console.error("Firebase Auth Instance:", auth);
      console.error("Firebase Config:", {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "✓" : "✗",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });

      // Provide user-friendly error messages based on Firebase error codes
      let userFriendlyMessage = errorMessage;
      if (errorCode === "auth/internal-error") {
        userFriendlyMessage =
          "Firebase authentication error. Please check:\n1. Firebase project settings\n2. OAuth is enabled in Firebase Console\n3. Authorized domains include this site\n4. Browser console for details";
      } else if (errorCode === "auth/popup-closed-by-user") {
        userFriendlyMessage = "Sign-in popup was closed. Please try again.";
      } else if (errorCode === "auth/network-request-failed") {
        userFriendlyMessage =
          "Network error. Please check your internet connection.";
      } else if (errorCode === "auth/unauthorized-domain") {
        userFriendlyMessage =
          "This domain is not authorized. Please contact support.";
      }

      setError(`${errorCode}: ${userFriendlyMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex items-center justify-center gap-3 px-8 py-4 bg-amber-150 border-4 border-black text-black font-medium text-lg rounded-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        aria-label="Sign in with Google"
      >
        {loading ? (
          <span>Signing in...</span>
        ) : (
          <>
            <GoogleIcon />
            <span>Let's Get Started!</span>
          </>
        )}
      </button>
      {error && <ErrorMessage message={error} />}
    </div>
  );
};

export default GoogleAuthButton;
