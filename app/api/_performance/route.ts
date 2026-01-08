import { NextRequest, NextResponse } from "next/server";
import {
  getSecurityHeaders,
  getErrorSecurityHeaders,
} from "@/lib/security-headers";
import { PerformanceMetricsSchema, validateInput } from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";

/**
 * Performance monitoring endpoint
 * Tracks Core Web Vitals and other performance metrics
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input using Zod
    const validation = validateInput(PerformanceMetricsSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid input data. Please check all fields.",
          details: validation.error.issues,
        },
        { status: 400, headers: getErrorSecurityHeaders() }
      );
    }

    const { metrics, userId, page } = validation.data;

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
    return handleApiError(error, { route: "/api/_performance" });
  }
}
