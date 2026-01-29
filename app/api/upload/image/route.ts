/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing */
import { type NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { verifyCSRF } from "@/lib/csrf";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { validateFileUpload } from "@/lib/validation";
import { env } from "@/lib/env";
import { handleApiError } from "@/lib/error-handler";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    // CSRF protection
    const csrfError = await verifyCSRF(request, user.uid);
    if (csrfError !== undefined && csrfError !== null) {
      return NextResponse.json(
        { error: csrfError.error },
        { status: csrfError.status, headers: csrfError.headers }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Validate file upload using utility
    const fileValidation = validateFileUpload(
      file,
      10 * 1024 * 1024, // 10MB
      [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ]
    );

    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error || "Invalid image file" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const apiKey = env.IMGBB_API_KEY;

    if (!apiKey || apiKey.length === 0) {
      console.error("IMGBB API key is not configured");
      return NextResponse.json(
        { error: "Image upload service is not configured" },
        { status: 500, headers: getErrorSecurityHeaders() }
      );
    }

    const uploadFormData = new FormData();
    uploadFormData.append("image", file);

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      {
        method: "POST",
        body: uploadFormData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("ImgBB API error:", errorData);
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to upload image" },
        { status: 500, headers: getErrorSecurityHeaders() }
      );
    }

    const data = await response.json();

    if (!data.success || !data.data?.url) {
      return NextResponse.json(
        { error: "Failed to upload image: Invalid response from imgbb" },
        { status: 500, headers: getErrorSecurityHeaders() }
      );
    }

    return NextResponse.json(
      { url: data.data.url },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    // Try to get user for error context, but don't fail if auth fails
    let userId: string | undefined;
    try {
      const user = await verifyAuth(request);
      userId = user?.uid;
    } catch {
      // Ignore auth errors in error handler
    }
    return handleApiError(error, { route: "/api/upload/image", userId });
  }
}
