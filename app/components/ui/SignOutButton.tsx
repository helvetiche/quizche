"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const SignOutButton = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
    >
      Sign Out
    </button>
  );
};

export default SignOutButton;
