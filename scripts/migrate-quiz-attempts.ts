/**
 * Migration Script: Add denormalized student info to legacy quizAttempts
 *
 * This script backfills studentEmail and studentName fields in quizAttempts
 * documents that were created before denormalization was implemented.
 *
 * Run this script once to improve performance for legacy data.
 *
 * Usage:
 *   npx tsx scripts/migrate-quiz-attempts.ts
 *
 * Note: This script is safe to run multiple times - it only updates
 * documents that don't have denormalized fields.
 */

import { adminDb } from "../lib/firebase-admin";

const BATCH_SIZE = 500; // Firestore batch write limit

async function migrateQuizAttempts() {
  console.log("Starting migration of quizAttempts...");

  let totalProcessed = 0;
  let totalUpdated = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  try {
    while (true) {
      // Query all attempts - Firestore doesn't support querying for null/missing fields
      // We'll filter client-side to find documents that need migration
      let query = adminDb
        .collection("quizAttempts")
        .orderBy("completedAt", "desc")
        .limit(BATCH_SIZE);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        console.log("No more documents to process.");
        break;
      }

      // Filter documents that need migration (missing denormalized fields)
      const docsToUpdate = snapshot.docs.filter((doc) => {
        const data = doc.data();
        return !data.studentEmail || !data.studentName;
      });

      if (docsToUpdate.length === 0) {
        // All documents in this batch are already migrated, continue
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        totalProcessed += snapshot.docs.length;
        continue;
      }

      // Collect unique user IDs
      const userIds = new Set<string>();
      docsToUpdate.forEach((doc) => {
        const userId = doc.data().userId;
        if (userId) userIds.add(userId);
      });

      // Batch fetch users
      const userMap = new Map<string, { email: string; displayName: string }>();
      const userIdsArray = Array.from(userIds);
      const userBatchSize = 10; // Firestore 'in' query limit

      for (let i = 0; i < userIdsArray.length; i += userBatchSize) {
        const batch = userIdsArray.slice(i, i + userBatchSize);
        const userPromises = batch.map((userId) =>
          adminDb.collection("users").doc(userId).get()
        );
        const userDocs = await Promise.all(userPromises);
        userDocs.forEach((doc, index) => {
          if (doc.exists) {
            const userData = doc.data();
            userMap.set(batch[index], {
              email: userData?.email || "",
              displayName: userData?.displayName || "",
            });
          }
        });
      }

      // Batch update documents
      const writeBatch = adminDb.batch();
      let batchCount = 0;

      for (const doc of docsToUpdate) {
        const attemptData = doc.data();
        const userId = attemptData.userId;
        const userInfo = userMap.get(userId);

        if (userInfo) {
          writeBatch.update(doc.ref, {
            studentEmail: userInfo.email,
            studentName: userInfo.displayName,
          });
          batchCount++;

          // Firestore batch limit is 500 operations
          if (batchCount >= 500) {
            await writeBatch.commit();
            totalUpdated += batchCount;
            console.log(`Updated ${totalUpdated} documents so far...`);
            // Start new batch
            const newBatch = adminDb.batch();
            newBatch.update(doc.ref, {
              studentEmail: userInfo.email,
              studentName: userInfo.displayName,
            });
            batchCount = 1;
          }
        }
      }

      // Commit remaining updates
      if (batchCount > 0) {
        await writeBatch.commit();
        totalUpdated += batchCount;
      }

      totalProcessed += snapshot.docs.length;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];

      console.log(
        `Processed ${totalProcessed} documents, updated ${totalUpdated} documents`
      );

      // If we got fewer documents than batch size, we're done
      if (snapshot.docs.length < BATCH_SIZE) {
        break;
      }
    }

    console.log(`\nMigration completed!`);
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total updated: ${totalUpdated}`);
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}

// Alternative approach: Query by checking if field doesn't exist
// This is more efficient but requires a different query strategy
async function migrateQuizAttemptsAlternative() {
  console.log("Starting migration (alternative approach)...");

  let totalProcessed = 0;
  let totalUpdated = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  try {
    while (true) {
      // Query all attempts - we'll filter client-side
      let query = adminDb
        .collection("quizAttempts")
        .orderBy("completedAt", "desc")
        .limit(BATCH_SIZE);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        console.log("No more documents to process.");
        break;
      }

      // Filter documents that need migration
      const docsToUpdate = snapshot.docs.filter((doc) => {
        const data = doc.data();
        return !data.studentEmail || !data.studentName;
      });

      if (docsToUpdate.length === 0) {
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        totalProcessed += snapshot.docs.length;
        continue;
      }

      // Collect unique user IDs
      const userIds = new Set<string>();
      docsToUpdate.forEach((doc) => {
        const userId = doc.data().userId;
        if (userId) userIds.add(userId);
      });

      // Batch fetch users
      const userMap = new Map<string, { email: string; displayName: string }>();
      const userIdsArray = Array.from(userIds);

      for (let i = 0; i < userIdsArray.length; i += 10) {
        const batch = userIdsArray.slice(i, i + 10);
        const userPromises = batch.map((userId) =>
          adminDb.collection("users").doc(userId).get()
        );
        const userDocs = await Promise.all(userPromises);
        userDocs.forEach((doc, index) => {
          if (doc.exists) {
            const userData = doc.data();
            userMap.set(batch[index], {
              email: userData?.email || "",
              displayName: userData?.displayName || "",
            });
          }
        });
      }

      // Batch update documents
      const writeBatch = adminDb.batch();
      let batchCount = 0;

      for (const doc of docsToUpdate) {
        const attemptData = doc.data();
        const userId = attemptData.userId;
        const userInfo = userMap.get(userId);

        if (
          userInfo &&
          (!attemptData.studentEmail || !attemptData.studentName)
        ) {
          writeBatch.update(doc.ref, {
            studentEmail: userInfo.email,
            studentName: userInfo.displayName,
          });
          batchCount++;

          if (batchCount >= 500) {
            await writeBatch.commit();
            totalUpdated += batchCount;
            console.log(`Updated ${totalUpdated} documents so far...`);
            // Note: This approach has a limitation - we can't easily continue
            // the batch. For production, use the first approach or process in smaller chunks.
            break;
          }
        }
      }

      if (batchCount > 0 && batchCount < 500) {
        await writeBatch.commit();
        totalUpdated += batchCount;
      }

      totalProcessed += snapshot.docs.length;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];

      console.log(
        `Processed ${totalProcessed} documents, updated ${totalUpdated} documents`
      );

      if (snapshot.docs.length < BATCH_SIZE) {
        break;
      }
    }

    console.log(`\nMigration completed!`);
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total updated: ${totalUpdated}`);
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrateQuizAttempts()
    .then(() => {
      console.log("Migration script finished successfully.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

export { migrateQuizAttempts };
