/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { type NextRequest } from "next/server";
import { adminAuth } from "./firebase-admin";

export type AuthUser = {
  uid: string;
  role: string | null;
  tier: string;
  email?: string;
};

export const verifyAuth = async (
  request: NextRequest
): Promise<AuthUser | null> => {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const hasRole =
      decodedToken.role !== null && decodedToken.role !== undefined;
    return {
      uid: decodedToken.uid,
      role: hasRole ? (decodedToken.role as string) : null,
      tier:
        (decodedToken.tier as string | undefined) !== undefined
          ? (decodedToken.tier as string)
          : "free",
      email: decodedToken.email,
    };
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
};
