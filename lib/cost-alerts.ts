/* eslint-disable no-await-in-loop, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-non-null-assertion */
import { adminDb } from "./firebase-admin";

/**
 * Cost alert thresholds (in USD)
 */
export const COST_THRESHOLDS = {
  daily: {
    warning: 10, // Warn if daily cost exceeds $10
    critical: 50, // Critical alert if daily cost exceeds $50
  },
  monthly: {
    warning: 200, // Warn if monthly cost exceeds $200
    critical: 1000, // Critical alert if monthly cost exceeds $1000
  },
} as const;

export type CostAlert = {
  type: "warning" | "critical";
  service: "gemini" | "firestore" | "imgbb" | "total";
  period: "daily" | "monthly";
  amount: number;
  threshold: number;
  date: string;
  timestamp: Date;
};

export const checkDailyCosts = async (): Promise<CostAlert[]> => {
  const alerts: CostAlert[] = [];
  const today = new Date().toISOString().split("T")[0];

  try {
    const services: ("gemini" | "firestore" | "imgbb")[] = [
      "gemini",
      "firestore",
      "imgbb",
    ];

    let totalDailyCost = 0;

    for (const service of services) {
      const dailyCostRef = adminDb
        .collection("costDailySummary")
        .doc(`${service}:${today}`);

      const dailyCostDoc = await dailyCostRef.get();
      const cost = dailyCostDoc.exists
        ? dailyCostDoc.data()?.totalAmount !== undefined
          ? (dailyCostDoc.data()!.totalAmount as number)
          : 0
        : 0;

      totalDailyCost += cost;

      if (cost >= COST_THRESHOLDS.daily.critical) {
        alerts.push({
          type: "critical",
          service,
          period: "daily",
          amount: cost,
          threshold: COST_THRESHOLDS.daily.critical,
          date: today,
          timestamp: new Date(),
        });
      } else if (cost >= COST_THRESHOLDS.daily.warning) {
        alerts.push({
          type: "warning",
          service,
          period: "daily",
          amount: cost,
          threshold: COST_THRESHOLDS.daily.warning,
          date: today,
          timestamp: new Date(),
        });
      }
    }

    if (totalDailyCost >= COST_THRESHOLDS.daily.critical) {
      alerts.push({
        type: "critical",
        service: "total",
        period: "daily",
        amount: totalDailyCost,
        threshold: COST_THRESHOLDS.daily.critical,
        date: today,
        timestamp: new Date(),
      });
    } else if (totalDailyCost >= COST_THRESHOLDS.daily.warning) {
      alerts.push({
        type: "warning",
        service: "total",
        period: "daily",
        amount: totalDailyCost,
        threshold: COST_THRESHOLDS.daily.warning,
        date: today,
        timestamp: new Date(),
      });
    }

    if (alerts.length > 0) {
      const batch = adminDb.batch();
      alerts.forEach((alert) => {
        const alertRef = adminDb.collection("costAlerts").doc();
        batch.set(alertRef, alert);
      });
      await batch.commit();

      console.warn(`Cost alerts generated: ${alerts.length}`, alerts);
    }

    return alerts;
  } catch (error) {
    console.error("Error checking daily costs:", error);
    return [];
  }
};

export const checkMonthlyCosts = async (): Promise<CostAlert[]> => {
  const alerts: CostAlert[] = [];
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  try {
    const services: ("gemini" | "firestore" | "imgbb")[] = [
      "gemini",
      "firestore",
      "imgbb",
    ];

    let totalMonthlyCost = 0;

    for (const service of services) {
      const monthlyCostDocs = await adminDb
        .collection("costDailySummary")
        .where("service", "==", service)
        .where("date", ">=", firstDayOfMonth)
        .get();

      let monthlyCost = 0;
      monthlyCostDocs.forEach((doc) => {
        monthlyCost +=
          doc.data()?.totalAmount !== undefined
            ? (doc.data().totalAmount as number)
            : 0;
      });

      totalMonthlyCost += monthlyCost;

      if (monthlyCost >= COST_THRESHOLDS.monthly.critical) {
        alerts.push({
          type: "critical",
          service,
          period: "monthly",
          amount: monthlyCost,
          threshold: COST_THRESHOLDS.monthly.critical,
          date: firstDayOfMonth,
          timestamp: new Date(),
        });
      } else if (monthlyCost >= COST_THRESHOLDS.monthly.warning) {
        alerts.push({
          type: "warning",
          service,
          period: "monthly",
          amount: monthlyCost,
          threshold: COST_THRESHOLDS.monthly.warning,
          date: firstDayOfMonth,
          timestamp: new Date(),
        });
      }
    }

    if (totalMonthlyCost >= COST_THRESHOLDS.monthly.critical) {
      alerts.push({
        type: "critical",
        service: "total",
        period: "monthly",
        amount: totalMonthlyCost,
        threshold: COST_THRESHOLDS.monthly.critical,
        date: firstDayOfMonth,
        timestamp: new Date(),
      });
    } else if (totalMonthlyCost >= COST_THRESHOLDS.monthly.warning) {
      alerts.push({
        type: "warning",
        service: "total",
        period: "monthly",
        amount: totalMonthlyCost,
        threshold: COST_THRESHOLDS.monthly.warning,
        date: firstDayOfMonth,
        timestamp: new Date(),
      });
    }

    if (alerts.length > 0) {
      const batch = adminDb.batch();
      alerts.forEach((alert) => {
        const alertRef = adminDb.collection("costAlerts").doc();
        batch.set(alertRef, alert);
      });
      await batch.commit();

      console.warn(`Monthly cost alerts generated: ${alerts.length}`, alerts);
    }

    return alerts;
  } catch (error) {
    console.error("Error checking monthly costs:", error);
    return [];
  }
};

/**
 * Get recent cost alerts
 */
export const getRecentAlerts = async (limit = 50): Promise<CostAlert[]> => {
  try {
    const alertsSnapshot = await adminDb
      .collection("costAlerts")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    return alertsSnapshot.docs.map((doc) => doc.data() as CostAlert);
  } catch (error) {
    console.error("Error getting recent alerts:", error);
    return [];
  }
};
