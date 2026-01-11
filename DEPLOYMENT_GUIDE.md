# Deployment Guide - Scalability Optimizations

This guide covers the steps needed to deploy the scalability optimizations implemented in QuizChe.

## 1. Firestore Indexes Deployment

The system now requires composite indexes for optimal query performance. Deploy them using one of these methods:

### Method 1: Firebase Console (Recommended)
1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Import the `firestore.indexes.json` file or manually create each index listed below

### Method 2: Firebase CLI
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy indexes
firebase deploy --only firestore:indexes
```

### Required Indexes:
- `flashcards`: `userId` (ASC) + `createdAt` (DESC)
- `flashcardShares`: `sharedWithUserId` (ASC) + `createdAt` (DESC)
- `flashcardShares`: `flashcardId` (ASC) + `sharedWithUserId` (ASC)
- `quizzes`: `teacherId` (ASC) + `createdAt` (DESC)
- `quizAttempts`: `userId` (ASC) + `completedAt` (DESC)
- `quizAttempts`: `quizId` (ASC) + `completedAt` (DESC)
- `quizAttempts`: `teacherId` (ASC) + `completedAt` (DESC)
- `quizAttempts`: `userId` (ASC) + `quizId` (ASC)
- `connections`: `userId1` (ASC) + `createdAt` (DESC)
- `connections`: `userId2` (ASC) + `createdAt` (DESC)
- `sections`: `teacherId` (ASC) + `createdAt` (DESC)
- `sections`: `sectionId` (ASC) + `studentId` (ASC)
- `rateLimits`: `expiresAt` (ASC)

**Note**: Index creation can take several minutes. Monitor progress in Firebase Console.

## 2. Environment Variables

Ensure these environment variables are set in Vercel:

```env
# Firebase Admin (required)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_PRIVATE_KEY=your-private-key
FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email

# Or use service account key
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Gemini AI (required)
NEXT_PRIVATE_GEMINI_API_KEY=your-gemini-api-key

# Upstash Redis (required for rate limiting and caching)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# ImgBB (optional, for image uploads)
IMGBB_API_KEY=your-imgbb-api-key
```

**Setting Environment Variables in Vercel:**
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable above
4. Redeploy your application

## 3. Install Dependencies

Install the required packages for Redis and rate limiting:

```bash
npm install @upstash/redis @upstash/ratelimit
```

Or if using yarn:
```bash
yarn add @upstash/redis @upstash/ratelimit
```

## 4. New Collections Created

The optimizations create these new Firestore collections:

- `usageTracking` - Tracks API usage for monitoring
- `costTracking` - Tracks costs per service
- `usageDailySummary` - Daily aggregated usage stats
- `costDailySummary` - Daily aggregated cost stats
- `pdfExtractionCache` - Caches PDF extraction results (30-day TTL)

**Note**: 
- Rate limiting is now handled by **Upstash Redis** (not Firestore)
- Caching is now handled by **Upstash Redis** (distributed across serverless instances)
- These collections will be created automatically on first use. Consider setting up TTL policies for automatic cleanup.

## 5. TTL Policies (Optional but Recommended)

Set up Time-To-Live policies for automatic cleanup:

```bash
# Using Firebase Console:
# Go to Firestore → Indexes → TTL Policies
# Create TTL policies for:
# - rateLimits.expiresAt
# - pdfExtractionCache.expiresAt
```

Or via Firebase CLI:
```bash
gcloud firestore fields ttl update expiresAt --collection-group=rateLimits
gcloud firestore fields ttl update expiresAt --collection-group=pdfExtractionCache
```

## 6. Monitoring Setup

### Usage Monitoring
The system automatically tracks:
- API calls per user
- Route usage statistics
- AI operation counts

View usage stats:
```typescript
import { getUserUsageStats } from "@/lib/monitoring";

const stats = await getUserUsageStats(userId, 30); // Last 30 days
```

### Cost Tracking
Costs are automatically tracked for:
- Gemini AI operations (with token estimates)
- Firestore operations (via usage tracking)

View daily costs:
```typescript
// Query costDailySummary collection
const dailyCosts = await adminDb
  .collection("costDailySummary")
  .where("date", ">=", startDate)
  .get();
```

## 7. Rate Limiting Configuration

**Now using @upstash/ratelimit** for distributed rate limiting across all Vercel serverless instances.

**Features:**
- Sliding window algorithm (more accurate than fixed window)
- Built-in analytics for monitoring
- Automatic key expiration
- Distributed across all serverless instances

Rate limits are configured in `lib/rate-limit.ts`:

```typescript
export const RATE_LIMITS = {
  auth: { limit: 5, window: 900 }, // 5 per 15 min
  aiGeneration: { limit: 3, window: 3600 }, // 3 per hour
  quizSubmit: { limit: 10, window: 3600 }, // 10 per hour
  general: { limit: 60, window: 60 }, // 60 per minute
  history: { limit: 30, window: 60 }, // 30 per minute
  flashcardCreate: { limit: 20, window: 3600 }, // 20 per hour
};
```

Adjust these values based on your needs.

## 8. Caching Configuration

**Now using Upstash Redis** for distributed caching across all Vercel serverless instances:

- **API Responses**: 5 minutes (300 seconds) - cached in Redis
- **AI-Generated Content**: 1 hour (3600 seconds) - cached in Redis
- **PDF Extractions**: 1 hour in Redis, 30 days in Firestore database

**Benefits of Redis caching:**
- Shared cache across all serverless instances
- Faster response times
- Reduced Firestore read costs
- Automatic expiration

## 9. Performance Testing

After deployment, test:
1. API response times (should be faster with caching)
2. Rate limiting (try exceeding limits)
3. Database query performance (check Firebase Console → Performance)
4. Cost tracking (verify costs are being logged)

## 10. Monitoring & Alerts

Set up alerts for:
- High API usage spikes
- High AI costs
- Rate limit violations
- Database query performance degradation

## 11. Scaling Considerations

### Current Implementation ✅ (Production-Ready)
- **Upstash Redis** for distributed caching and rate limiting
- **Firestore** for database and monitoring
- **Vercel** for serverless hosting
- **Basic monitoring** via Firestore collections

### Already Optimized For:
- ✅ Distributed rate limiting (Redis)
- ✅ Distributed caching (Redis)
- ✅ Multiple serverless instances (Vercel)
- ✅ Cost tracking and monitoring

### Additional Optimizations (Optional at 100K+ users)
1. **Monitoring Service** (e.g., Datadog, New Relic) for advanced analytics
2. **CDN** for static assets (Vercel Edge Network)
3. **Database Read Replicas** if Firestore read costs become high
4. **Upgrade Upstash Redis plan** if needed for higher throughput

## Troubleshooting

### Index Creation Fails
- Ensure you have proper Firestore permissions
- Check that collection names match exactly
- Verify field names and types match your data

### Rate Limiting Not Working
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Check Redis connection (check Vercel logs)
- Verify rate limit configuration
- Check Redis dashboard in Upstash console

### Caching Not Working
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Check Redis connection (check Vercel logs)
- Verify cache keys are consistent
- Check Redis dashboard in Upstash console for cached keys
- Ensure TTL values are appropriate

### Cost Tracking Not Working
- Verify `costTracking` collection exists
- Check Firestore write permissions
- Review error logs for tracking failures

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review application logs
3. Check Firestore usage metrics
4. Review rate limit collection data
