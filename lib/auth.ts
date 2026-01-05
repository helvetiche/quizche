import { NextRequest } from "next/server";
import { adminAuth } from "./firebase-admin";

export interface AuthUser {
  uid: string;
  role: string | null;
  tier: string;
  email?: string;
}

export const verifyAuth = async (
  request: NextRequest
): Promise<AuthUser | null> => {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const hasRole = decodedToken.role && decodedToken.role !== undefined;
    return {
      uid: decodedToken.uid,
      role: hasRole ? decodedToken.role : null,
      tier: decodedToken.tier || "free",
      email: decodedToken.email,
    };
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
};
