import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCSRF } from "@/lib/csrf";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import cache, { getApiCacheKey } from "@/lib/cache";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
  getPublicSecurityHeaders,
} from "@/lib/security-headers";
import { ConnectionRequestSchema, validateInput } from "@/lib/validation";

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
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Forbidden: Student role required" },
        { status: 403, headers: getErrorSecurityHeaders() }
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
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: getErrorSecurityHeaders({
            rateLimitHeaders: rateLimitResult.headers,
          }),
        }
      );
    }

    // Check cache first
    const cacheKey = getApiCacheKey("/api/connections", user.uid);
    const cached = await cache.get<{ connections: any[]; users: any }>(cacheKey);
    if (cached) {
      return NextResponse.json(
        cached,
        {
          status: 200,
          headers: getPublicSecurityHeaders({
            rateLimitHeaders: rateLimitResult.headers,
            cacheControl: "private, max-age=300",
          }),
        }
      );
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

    const result = { connections: enrichedConnections };

    // Cache the response
    await cache.set(cacheKey, result, 300); // 5 minutes

    return NextResponse.json(
      result,
      {
        status: 200,
        headers: getPublicSecurityHeaders({
          rateLimitHeaders: rateLimitResult.headers,
          cacheControl: "private, max-age=300",
        }),
      }
    );
  } catch (error) {
    console.error("Get connections error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing authentication token" },
        { status: 401, headers: getErrorSecurityHeaders() }
      );
    }

    if (user.role !== "student") {
      return NextResponse.json(
        { error: "Forbidden: Student role required" },
        { status: 403, headers: getErrorSecurityHeaders() }
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

    // Validate input using Zod
    const validation = validateInput(ConnectionRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid connection request data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const validatedData = validation.data;
    const targetUserId = validatedData.toUserId;

    if (targetUserId === user.uid) {
      return NextResponse.json(
        { error: "Cannot send connection request to yourself" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Verify target user exists and is a student
    const targetUserDoc = await adminDb.collection("users").doc(targetUserId).get();
    if (!targetUserDoc.exists) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404, headers: getErrorSecurityHeaders() }
      );
    }

    const targetUserData = targetUserDoc.data();
    if (targetUserData?.role !== "student") {
      return NextResponse.json(
        { error: "Can only connect with students" },
        { status: 400, headers: getErrorSecurityHeaders() }
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

      if (existingData?.status === "accepted") {
        return NextResponse.json(
          { error: "Connection already exists" },
          { status: 400, headers: getErrorSecurityHeaders() }
        );
      }

      if (existingData?.status === "pending") {
        if (existingData?.requestedBy === user.uid) {
          return NextResponse.json(
            { error: "Connection request already sent" },
            { status: 400, headers: getErrorSecurityHeaders() }
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

          // Invalidate cache
          await cache.delete(getApiCacheKey("/api/connections", user.uid));
          await cache.delete(getApiCacheKey("/api/connections", targetUserId));

          return NextResponse.json(
            {
              id: connectionId,
              message: "Connection request accepted",
              status: "accepted",
            },
            { status: 200, headers: getSecurityHeaders() }
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

    // Invalidate cache
    await cache.delete(getApiCacheKey("/api/connections", user.uid));
    await cache.delete(getApiCacheKey("/api/connections", targetUserId));

    return NextResponse.json(
      {
        id: connectionId,
        message: "Connection request sent successfully",
        status: "pending",
      },
      { status: 201, headers: getSecurityHeaders() }
    );
  } catch (error) {
    console.error("Create connection request error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}
