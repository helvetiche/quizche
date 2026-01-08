import { adminDb } from "./firebase-admin";

const USAGE_COLLECTION = "usageTracking";
const COST_COLLECTION = "costTracking";

export interface UsageEvent {
  userId: string;
  route: string;
  method: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CostEvent {
  service: "gemini" | "firestore" | "imgbb" | "other";
  amount: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Track API usage for monitoring and cost analysis
 */
export const trackUsage = async (event: UsageEvent): Promise<void> => {
  try {
    // Use batch writes to reduce costs
    const batch = adminDb.batch();
    const docRef = adminDb.collection(USAGE_COLLECTION).doc();

    batch.set(docRef, {
      ...event,
      timestamp: event.timestamp || new Date(),
      date: new Date().toISOString().split("T")[0], // For daily aggregation
      hour: new Date().getHours(), // For hourly aggregation
    });

    // Also update daily summary (denormalized for efficient queries)
    const dailySummaryRef = adminDb
      .collection("usageDailySummary")
      .doc(`${event.userId}:${new Date().toISOString().split("T")[0]}`);

    const dailySummaryDoc = await dailySummaryRef.get();
    if (dailySummaryDoc.exists) {
      const data = dailySummaryDoc.data();
      batch.update(dailySummaryRef, {
        count: (data?.count || 0) + 1,
        lastUpdated: new Date(),
        routes: {
          ...(data?.routes || {}),
          [event.route]: ((data?.routes?.[event.route] || 0) + 1),
        },
      });
    } else {
      batch.set(dailySummaryRef, {
        userId: event.userId,
        date: new Date().toISOString().split("T")[0],
        count: 1,
        routes: {
          [event.route]: 1,
        },
        createdAt: new Date(),
        lastUpdated: new Date(),
      });
    }

    await batch.commit();
  } catch (error) {
    // Don't fail the request if tracking fails
    console.error("Usage tracking error:", error);
  }
};

/**
 * Track costs for different services
 */
export const trackCost = async (event: CostEvent): Promise<void> => {
  try {
    const docRef = adminDb.collection(COST_COLLECTION).doc();
    await docRef.set({
      ...event,
      timestamp: event.timestamp || new Date(),
      date: new Date().toISOString().split("T")[0],
    });

    // Update daily cost summary
    const dailyCostRef = adminDb
      .collection("costDailySummary")
      .doc(`${event.service}:${new Date().toISOString().split("T")[0]}`);

    const dailyCostDoc = await dailyCostRef.get();
    if (dailyCostDoc.exists) {
      const data = dailyCostDoc.data();
      await dailyCostRef.update({
        totalAmount: (data?.totalAmount || 0) + event.amount,
        count: (data?.count || 0) + 1,
        lastUpdated: new Date(),
      });
    } else {
      await dailyCostRef.set({
        service: event.service,
        date: new Date().toISOString().split("T")[0],
        totalAmount: event.amount,
        count: 1,
        createdAt: new Date(),
        lastUpdated: new Date(),
      });
    }
  } catch (error) {
    console.error("Cost tracking error:", error);
  }
};

/**
 * Track AI API usage (Gemini)
 */
export const trackAIUsage = async (
  userId: string,
  operation: "pdf_extraction" | "quiz_generation" | "flashcard_generation",
  tokens: { input: number; output: number },
  cost: number
): Promise<void> => {
  await trackCost({
    service: "gemini",
    amount: cost,
    unit: "USD",
    timestamp: new Date(),
    metadata: {
      userId,
      operation,
      tokens,
    },
  });

  await trackUsage({
    userId,
    route: `/api/${operation}`,
    method: "POST",
    timestamp: new Date(),
    metadata: {
      operation,
      tokens,
      cost,
    },
  });
};

/**
 * Get usage stats for a user
 */
export const getUserUsageStats = async (
  userId: string,
  days: number = 30
): Promise<{
  totalRequests: number;
  requestsByRoute: Record<string, number>;
  aiUsage: {
    pdfExtractions: number;
    quizGenerations: number;
    flashcardGenerations: number;
  };
}> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const summaryDocs = await adminDb
      .collection("usageDailySummary")
      .where("userId", "==", userId)
      .where("date", ">=", startDate.toISOString().split("T")[0])
      .get();

    let totalRequests = 0;
    const requestsByRoute: Record<string, number> = {};

    summaryDocs.forEach((doc) => {
      const data = doc.data();
      totalRequests += data?.count || 0;
      Object.entries(data?.routes || {}).forEach(([route, count]) => {
        requestsByRoute[route] = (requestsByRoute[route] || 0) + (count as number);
      });
    });

    // Get AI usage from cost tracking
    const aiCostDocs = await adminDb
      .collection(COST_COLLECTION)
      .where("service", "==", "gemini")
      .where("timestamp", ">=", startDate)
      .get();

    const aiUsage = {
      pdfExtractions: 0,
      quizGenerations: 0,
      flashcardGenerations: 0,
    };

    aiCostDocs.forEach((doc) => {
      const data = doc.data();
      const operation = data?.metadata?.operation;
      if (operation === "pdf_extraction") {
        aiUsage.pdfExtractions++;
      } else if (operation === "quiz_generation") {
        aiUsage.quizGenerations++;
      } else if (operation === "flashcard_generation") {
        aiUsage.flashcardGenerations++;
      }
    });

    return {
      totalRequests,
      requestsByRoute,
      aiUsage,
    };
  } catch (error) {
    console.error("Error getting usage stats:", error);
    return {
      totalRequests: 0,
      requestsByRoute: {},
      aiUsage: {
        pdfExtractions: 0,
        quizGenerations: 0,
        flashcardGenerations: 0,
      },
    };
  }
};
