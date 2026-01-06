import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { verifyCSRF } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers }
      );
    }

    // CSRF protection
    const csrfError = await verifyCSRF(request, user.uid);
    if (csrfError) {
      return NextResponse.json(
        { error: csrfError.error },
        { status: csrfError.status, headers: csrfError.headers }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400, headers }
      );
    }

    if (!file.type.startsWith("image/")) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400, headers }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Image size must be less than 10MB" },
        { status: 400, headers }
      );
    }

    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      console.error("IMGBB API key is not configured");
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Image upload service is not configured" },
        { status: 500, headers }
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
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to upload image" },
        { status: 500, headers }
      );
    }

    const data = await response.json();

    if (!data.success || !data.data?.url) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Failed to upload image: Invalid response from imgbb" },
        { status: 500, headers }
      );
    }

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { url: data.data.url },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Image upload error:", error);
    const errorHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: errorHeaders }
    );
  }
}
