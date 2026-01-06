import { NextRequest, NextResponse } from "next/server";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";

/**
 * Performance monitoring endpoint
 * Tracks Core Web Vitals and other performance metrics
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metrics, userId, page } = body;

    // Validate metrics structure
    if (!metrics || typeof metrics !== "object") {
      return NextResponse.json(
        { error: "Invalid metrics data" },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    // Extract Core Web Vitals
    const vitals = {
      FCP: metrics.FCP, // First Contentful Paint
      LCP: metrics.LCP, // Largest Contentful Paint
      FID: metrics.FID, // First Input Delay
      CLS: metrics.CLS, // Cumulative Layout Shift
      TTFB: metrics.TTFB, // Time to First Byte
      INP: metrics.INP, // Interaction to Next Paint
    };

    // Log performance metrics (in production, send to monitoring service)
    console.log("Performance metrics:", {
      userId,
      page,
      vitals,
      timestamp: new Date().toISOString(),
    });

    // In production, you would:
    // 1. Store metrics in database/monitoring service
    // 2. Set up alerts for poor performance
    // 3. Aggregate metrics for analytics dashboard

    return NextResponse.json(
      { success: true, message: "Metrics recorded" },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    console.error("Performance monitoring error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getErrorSecurityHeaders() }
    );
  }
}
