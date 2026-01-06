import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import cache, { getApiCacheKey } from "@/lib/cache";

const getConnectionId = (userId1: string, userId2: string): string => {
  return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
};

const getSortedUserIds = (userId1: string, userId2: string): [string, string] => {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
};

export async function GET(request: NextRequest) {
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

    if (user.role !== "student") {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: Student role required" },
        { status: 403, headers }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      identifier: user.uid,
      key: "connections:list",
      limit: RATE_LIMITS.general.limit,
      window: RATE_LIMITS.general.window,
    });

    if (!rateLimitResult.success) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        ...rateLimitResult.headers,
      };
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers }
      );
    }

    // Check cache first
    const cacheKey = getApiCacheKey("/api/connections", user.uid);
    const cached = await cache.get<{ connections: any[]; users: any }>(cacheKey);
    if (cached) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security":
          "max-age=31536000; includeSubDomains; preload",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        "Cache-Control": "private, max-age=300",
        Vary: "Accept, Authorization",
        ...rateLimitResult.headers,
      };
      return NextResponse.json(cached, { status: 200, headers });
    }

    // Query connections where user is userId1 or userId2
    const [connectionsAsUser1, connectionsAsUser2] = await Promise.all([
      adminDb
        .collection("connections")
        .where("userId1", "==", user.uid)
        .get(),
      adminDb
        .collection("connections")
        .where("userId2", "==", user.uid)
        .get(),
    ]);

    const connections: any[] = [];
    const userIds = new Set<string>();

    // Process connections where user is userId1
    connectionsAsUser1.forEach((doc) => {
      const data = doc.data();
      const otherUserId = data.userId2;
      userIds.add(otherUserId);
      connections.push({
        id: doc.id,
        otherUserId,
        status: data.status,
        requestedBy: data.requestedBy,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      });
    });

    // Process connections where user is userId2
    connectionsAsUser2.forEach((doc) => {
      const data = doc.data();
      const otherUserId = data.userId1;
      userIds.add(otherUserId);
      connections.push({
        id: doc.id,
        otherUserId,
        status: data.status,
        requestedBy: data.requestedBy,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      });
    });

    // Fetch user details for connections
    const userDetails: Record<string, any> = {};
    if (userIds.size > 0) {
      const userDocs = await Promise.all(
        Array.from(userIds).map((uid) =>
          adminDb.collection("users").doc(uid).get()
        )
      );

      userDocs.forEach((doc) => {
        if (doc.exists) {
          const data = doc.data();
          userDetails[doc.id] = {
            displayName: data?.displayName || data?.firstName || "",
            email: data?.email || "",
          };
        }
      });
    }

    // Enrich connections with user details
    const enrichedConnections = connections.map((conn) => ({
      ...conn,
      otherUser: userDetails[conn.otherUserId] || {
        displayName: "",
        email: "",
      },
    }));

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
      "Cache-Control": "private, max-age=300",
      Vary: "Accept, Authorization",
      ...rateLimitResult.headers,
    };

    const result = { connections: enrichedConnections };

    // Cache the response
    await cache.set(cacheKey, result, 300); // 5 minutes

    return NextResponse.json(result, { status: 200, headers });
  } catch (error) {
    console.error("Get connections error:", error);

    const errorHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: errorHeaders }
    );
  }
}

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

    if (user.role !== "student") {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Forbidden: Student role required" },
        { status: 403, headers }
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

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId || typeof targetUserId !== "string") {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Target user ID is required" },
        { status: 400, headers }
      );
    }

    if (targetUserId === user.uid) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Cannot send connection request to yourself" },
        { status: 400, headers }
      );
    }

    // Verify target user exists and is a student
    const targetUserDoc = await adminDb.collection("users").doc(targetUserId).get();
    if (!targetUserDoc.exists) {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404, headers }
      );
    }

    const targetUserData = targetUserDoc.data();
    if (targetUserData?.role !== "student") {
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };
      return NextResponse.json(
        { error: "Can only connect with students" },
        { status: 400, headers }
      );
    }

    // Check if connection already exists
    const [userId1, userId2] = getSortedUserIds(user.uid, targetUserId);
    const connectionId = getConnectionId(user.uid, targetUserId);
    const existingConnection = await adminDb
      .collection("connections")
      .doc(connectionId)
      .get();

    if (existingConnection.exists) {
      const existingData = existingConnection.data();
      const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      };

      if (existingData?.status === "accepted") {
        return NextResponse.json(
          { error: "Connection already exists" },
          { status: 400, headers }
        );
      }

      if (existingData?.status === "pending") {
        if (existingData?.requestedBy === user.uid) {
          return NextResponse.json(
            { error: "Connection request already sent" },
            { status: 400, headers }
          );
        } else {
          // Auto-accept if the other user sent a request
          await adminDb
            .collection("connections")
            .doc(connectionId)
            .update({
              status: "accepted",
              updatedAt: new Date(),
            });

          return NextResponse.json(
            {
              id: connectionId,
              message: "Connection request accepted",
              status: "accepted",
            },
            { status: 200, headers }
          );
        }
      }
    }

    // Create new connection request
    await adminDb.collection("connections").doc(connectionId).set({
      userId1,
      userId2,
      status: "pending",
      requestedBy: user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      {
        id: connectionId,
        message: "Connection request sent successfully",
        status: "pending",
      },
      { status: 201, headers }
    );
  } catch (error) {
    console.error("Create connection request error:", error);

    const errorHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: errorHeaders }
    );
  }
}
