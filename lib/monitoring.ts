import { adminDb } from "./firebase-admin";

const USAGE_COLLECTION = "usageTracking";
const COST_COLLECTION = "costTracking";

export type UsageEvent = {
  userId: string;
  route: string;
  method: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
};

export type CostEvent = {
  service: "gemini" | "firestore" | "imgbb" | "other";
  amount: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
};

export const trackUsage = async (event: UsageEvent): Promise<void> => {
  try {
    const batch = adminDb.batch();
    const docRef = adminDb.collection(USAGE_COLLECTION).doc();

    batch.set(docRef, {
      ...event,
      timestamp: event.timestamp ?? new Date(),
      date: new Date().toISOString().split("T")[0],
      hour: new Date().getHours(),
    });

    const dailySummaryRef = adminDb
      .collection("usageDailySummary")
      .doc(`${event.userId}:${new Date().toISOString().split("T")[0]}`);

    const dailySummaryDoc = await dailySummaryRef.get();
    if (dailySummaryDoc.exists) {
      const data = dailySummaryDoc.data();
      const currentCount = (data?.count ?? 0) as number;
      const currentRoutes = (data?.routes ?? {}) as Record<string, number>;
      const routeCount = currentRoutes[event.route] ?? 0;

      batch.update(dailySummaryRef, {
        count: currentCount + 1,
        lastUpdated: new Date(),
        routes: {
          ...currentRoutes,
          [event.route]: routeCount + 1,
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
    console.error("Usage tracking error:", error);
  }
};

export const trackCost = async (event: CostEvent): Promise<void> => {
  try {
    const docRef = adminDb.collection(COST_COLLECTION).doc();
    await docRef.set({
      ...event,
      timestamp: event.timestamp ?? new Date(),
      date: new Date().toISOString().split("T")[0],
    });

    const dailyCostRef = adminDb
      .collection("costDailySummary")
      .doc(`${event.service}:${new Date().toISOString().split("T")[0]}`);

    const dailyCostDoc = await dailyCostRef.get();
    if (dailyCostDoc.exists) {
      const data = dailyCostDoc.data();
      const currentAmount = (data?.totalAmount ?? 0) as number;
      const currentCount = (data?.count ?? 0) as number;

      await dailyCostRef.update({
        totalAmount: currentAmount + event.amount,
        count: currentCount + 1,
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

export const getUserUsageStats = async (
  userId: string,
  days = 30
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
      totalRequests += (data?.count ?? 0) as number;
      Object.entries((data?.routes ?? {}) as Record<string, number>).forEach(
        ([route, count]) => {
          requestsByRoute[route] = (requestsByRoute[route] ?? 0) + count;
        }
      );
    });

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
      const metadata = data?.metadata as Record<string, unknown> | undefined;
      const operation = metadata?.operation;
      if (operation === "pdf_extraction") {
        aiUsage.pdfExtractions += 1;
      } else if (operation === "quiz_generation") {
        aiUsage.quizGenerations += 1;
      } else if (operation === "flashcard_generation") {
        aiUsage.flashcardGenerations += 1;
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
