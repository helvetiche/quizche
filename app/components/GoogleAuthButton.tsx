"use client";

import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import GoogleIcon from "./ui/GoogleIcon";
import ErrorMessage from "./ui/ErrorMessage";

interface GoogleAuthButtonProps {
  onLoginSuccess?: (role: string | null, idToken: string) => void;
}

const GoogleAuthButton = ({ onLoginSuccess }: GoogleAuthButtonProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

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
        throw new Error("Login failed");
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
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError("Failed to sign in with Google");
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
