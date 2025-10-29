

# Discovery Feed Enhancement Guide

Complete documentation for the enhanced Discovery Feed system with ML-based personalization, sharing, trending, and related content features.

## 📚 Table of Contents

1. [Overview](#overview)
2. [Personalized Recommendations](#personalized-recommendations)
3. [Share Functionality](#share-functionality)
4. [Related Content](#related-content)
5. [Recently Viewed](#recently-viewed)
6. [Trending System](#trending-system)
7. [Usage Examples](#usage-examples)
8. [API Reference](#api-reference)

---

## Overview

The Discovery Feed system provides intelligent content discovery through:

- ✅ **ML-based Recommendations** - Personalized suggestions
- ✅ **Share Functionality** - Multi-platform sharing
- ✅ **Related Content** - Similar schemes/exams
- ✅ **Recently Viewed** - User viewing history
- ✅ **Trending** - Popular items this week

---

## Personalized Recommendations

### Recommendation Engine

ML-powered recommendation system using collaborative and content-based filtering.

```typescript
import { recommendationEngine } from '@/lib/recommendationEngine';

const recommendations = await recommendationEngine.getPersonalizedRecommendations({
  userId: 'user-123',
  limit: 20,
  excludeApplied: true,
  categoryFilter: ['exam', 'scheme'],
  diversify: true,
});
```

### Scoring Factors

The recommendation engine considers multiple factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Category Preference | 20% | User's preferred categories |
| Location Relevance | 15% | State/region match |
| Viewing History | 25% | Similar to viewed items |
| Trending Score | 10% | Popular items |
| Deadline Urgency | 15% | Approaching deadlines |
| Popularity | 10% | View/application counts |
| Tag Matching | 5% | Interest-based tags |

### Diversification

Automatically diversifies recommendations to avoid repetition:

```typescript
// Max 3 items per category by default
const diversified = recommendationEngine.diversifyRecommendations(items);
```

### Component Usage

```typescript
import { PersonalizedFeed } from '@/components/discovery/PersonalizedFeed';

<PersonalizedFeed
  userId={user.id}
  limit={20}
  showReason={true}
/>
```

**Features:**
- Top picks highlighted
- Reason for recommendation shown
- Live deadline countdowns
- Quick share button
- Click tracking

---

## Share Functionality

### Share Service

Multi-platform sharing with Web Share API and fallbacks.

```typescript
import { shareService } from '@/lib/shareService';

// Native share (Web Share API)
const result = await shareService.share({
  title: 'SSC CGL 2025',
  text: 'Check out this exam opportunity!',
  url: 'https://sarkarikhozo.com/application/123',
  type: 'exam',
  category: 'Government Exams',
});

// Platform-specific sharing
shareService.shareViaWhatsApp(data);
shareService.shareViaTelegram(data);
shareService.shareViaTwitter(data);
shareService.shareViaFacebook(data);
```

### ShareDialog Component

Ready-to-use share dialog with all platforms:

```typescript
import { ShareDialog } from '@/components/discovery/ShareDialog';

<ShareDialog
  open={shareDialogOpen}
  onOpenChange={setShareDialogOpen}
  data={{
    title: application.title,
    text: shareService.generateShareText(
      application.title,
      application.type,
      application.deadline
    ),
    url: shareService.generateShareLink(application.id, application.type),
    type: application.type,
    category: application.category,
  }}
/>
```

### Supported Platforms

- **Native Share** - System share sheet (iOS, Android, modern browsers)
- **WhatsApp** - Direct messaging
- **Telegram** - Telegram share
- **Twitter** - Tweet with link
- **Facebook** - Facebook share
- **Copy Link** - Clipboard fallback

### UTM Tracking

Automatically adds UTM parameters for analytics:

```typescript
const link = shareService.generateShareLink(itemId, 'scheme');
// Returns: /application/123?utm_source=share&utm_medium=social&utm_campaign=discovery
```

### Share Analytics

Track share events:

```typescript
// Automatic tracking
shareService.trackShare(url, 'whatsapp');

// Get share count
const shareCount = shareService.getShareCount(itemId);
```

---

## Related Content

### Content Similarity

Finds similar schemes/exams using multiple similarity metrics.

```typescript
import { relatedContent } from '@/lib/relatedContent';

const related = await relatedContent.getRelatedItems({
  itemId: 'scheme-123',
  limit: 6,
  minSimilarity: 0.3,
  includeTypes: ['scheme', 'exam', 'job'],
});
```

### Similarity Calculation

Multi-factor similarity scoring:

| Factor | Weight | Method |
|--------|--------|--------|
| Category | 30% | Exact match |
| Type | 10% | Exact match |
| Tags | 30% | Jaccard index |
| Title | 20% | Word overlap |
| Eligibility | 10% | Field comparison |

### Component Usage

```typescript
import { RelatedItemsSection } from '@/components/discovery/RelatedItemsSection';

<RelatedItemsSection
  itemId={application.id}
  limit={6}
  horizontal={false}
/>
```

**Features:**
- Similarity percentage shown
- Reason for relation displayed
- Tag overlap highlighted
- Live deadlines

### Caching

Automatic caching with 5-minute TTL:

```typescript
// Results cached automatically
const related = await relatedContent.getRelatedItems({ itemId });

// Manual cache control
relatedContent.clearCache();

// Prefetch for multiple items
await relatedContent.prefetchRelated(['id1', 'id2', 'id3']);
```

---

## Recently Viewed

### Viewing History Tracker

Automatic tracking of user viewing behavior.

```typescript
import { viewingHistory } from '@/lib/viewingHistory';

// Track when user views an item
await viewingHistory.trackView(
  userId,
  itemId,
  'scheme',
  'PM Kisan Samman Nidhi',
  'Agriculture',
  'discover'
);

// Track when user leaves
await viewingHistory.trackViewEnd(userId, itemId);

// Get recently viewed
const recent = await viewingHistory.getRecentlyViewed(userId, 10);
```

### Time Tracking

Automatic time-on-page tracking:

```typescript
// Start tracking (on page load)
trackView(userId, itemId, ...);

// End tracking (on page leave)
trackViewEnd(userId, itemId);

// Time automatically calculated and stored
```

### Component Usage

```typescript
import { RecentlyViewed } from '@/components/discovery/RecentlyViewed';

<RecentlyViewed
  userId={user.id}
  limit={10}
  horizontal={true}
/>
```

**Features:**
- Horizontal scrollable cards
- Time spent displayed (if >30s)
- Clear history button
- Relative time ("2h ago", "5d ago")

### Privacy Controls

```typescript
// Clear all history
await viewingHistory.clearHistory(userId);

// Clear specific item (automatic on 100+ items)
// Keeps only last 100 views
```

---

## Trending System

### Trending Algorithm

Calculate trending items based on recent activity.

```typescript
import { trendingService } from '@/lib/trendingService';

// Get trending items
const trending = await trendingService.getTrending({
  timeWindow: 'week',
  limit: 10,
  category: 'exam',
  type: 'scheme',
});

// Get trending categories
const categories = await trendingService.getTrendingCategories(5);

// Get trending tags
const tags = await trendingService.getTrendingTags(10);

// Check if specific item is trending
const isTrending = await trendingService.isItemTrending(itemId);
```

### Trending Score Formula

```typescript
// Modified Wilson score with time decay
score = (totalActivity * timeFactor * urgencyFactor) / log(ageInHours + 2)

where:
  totalActivity = viewCount + (applicationCount * 5)
  timeFactor = e^(-decayRate * ageInHours / 24)
  urgencyFactor = 1.5 if deadline <= 7 days, else 1.0
```

### Time Windows

- **Day** - Last 24 hours (high decay rate)
- **Week** - Last 7 days (medium decay)
- **Month** - Last 30 days (low decay)

### Component Usage

```typescript
import { TrendingSection } from '@/components/discovery/TrendingSection';

<TrendingSection
  userId={user.id}
  limit={10}
/>
```

**Features:**
- Tabbed interface (Today / This Week)
- Ranked list (top 3 highlighted)
- Growth indicators ("Hot" badge)
- View counts and application stats

### Caching

15-minute cache TTL:

```typescript
// Automatic caching
const trending = await trendingService.getTrending();

// Manual refresh
await trendingService.refresh();

// Clear cache
trendingService.clearCache();
```

---

## Usage Examples

### Example 1: Complete Discovery Page

```typescript
import { PersonalizedFeed } from '@/components/discovery/PersonalizedFeed';
import { TrendingSection } from '@/components/discovery/TrendingSection';
import { RecentlyViewed } from '@/components/discovery/RecentlyViewed';

function DiscoveryPage({ user }) {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Recently Viewed */}
      <RecentlyViewed
        userId={user.id}
        limit={10}
        horizontal={true}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Main Feed */}
        <div className="lg:col-span-2">
          <PersonalizedFeed
            userId={user.id}
            limit={20}
            showReason={true}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <TrendingSection
            userId={user.id}
            limit={10}
          />
        </div>
      </div>
    </div>
  );
}
```

### Example 2: Application Detail with Related Items

```typescript
import { RelatedItemsSection } from '@/components/discovery/RelatedItemsSection';
import { ShareDialog } from '@/components/discovery/ShareDialog';
import { shareService } from '@/lib/shareService';
import { viewingHistory } from '@/lib/viewingHistory';

function ApplicationDetail({ application, user }) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  useEffect(() => {
    // Track view
    viewingHistory.trackView(
      user.id,
      application.id,
      application.type,
      application.title,
      application.category,
      'direct'
    );

    // Track view end on unmount
    return () => {
      viewingHistory.trackViewEnd(user.id, application.id);
    };
  }, [application.id, user.id]);

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  return (
    <div>
      {/* Application Details */}
      <div className="mb-8">
        <h1>{application.title}</h1>
        <Button onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      {/* Related Items */}
      <RelatedItemsSection
        itemId={application.id}
        limit={6}
        horizontal={false}
      />

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        data={{
          title: application.title,
          text: shareService.generateShareText(
            application.title,
            application.type,
            application.deadline
          ),
          url: shareService.generateShareLink(application.id, application.type),
          type: application.type,
          category: application.category,
        }}
      />
    </div>
  );
}
```

### Example 3: Custom Recommendation Widget

```typescript
import { recommendationEngine } from '@/lib/recommendationEngine';

function RecommendationWidget({ userId }) {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    loadRecommendations();
  }, [userId]);

  const loadRecommendations = async () => {
    const items = await recommendationEngine.getPersonalizedRecommendations({
      userId,
      limit: 5,
      categoryFilter: ['exam'], // Only exams
      diversify: false, // Don't diversify
      excludeApplied: true,
    });

    setRecommendations(items);
  };

  return (
    <div>
      <h3>Top Exam Recommendations</h3>
      {recommendations.map(item => (
        <div key={item.id}>
          <h4>{item.title}</h4>
          <p>Score: {item.score.toFixed(2)}</p>
          <p>{item.reason}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## API Reference

### RecommendationEngine

```typescript
class RecommendationEngine {
  // Get personalized recommendations
  getPersonalizedRecommendations(context: RecommendationContext): Promise<RecommendationItem[]>;
  
  // Clear cache for user
  clearCache(userId: string): void;
  
  // Clear all caches
  clearAllCaches(): void;
}

interface RecommendationContext {
  userId: string;
  limit?: number;
  excludeApplied?: boolean;
  categoryFilter?: string[];
  diversify?: boolean;
}

interface RecommendationItem {
  id: string;
  title: string;
  type: 'scheme' | 'exam' | 'job' | 'startup';
  category: string;
  score: number;
  reason: string;
  tags?: string[];
  deadline?: string;
}
```

### ShareService

```typescript
class ShareService {
  // Native share
  share(data: ShareData): Promise<{ success: boolean; method: string }>;
  
  // Platform-specific
  shareViaWhatsApp(data: ShareData): void;
  shareViaTelegram(data: ShareData): void;
  shareViaTwitter(data: ShareData): void;
  shareViaFacebook(data: ShareData): void;
  
  // Utilities
  generateShareLink(itemId: string, type: string): string;
  generateShareText(title: string, type: string, deadline?: string): string;
  isNativeShareSupported(): boolean;
  getShareCount(itemId: string): number;
}

interface ShareData {
  title: string;
  text: string;
  url: string;
  type: 'scheme' | 'exam' | 'job' | 'startup';
  category?: string;
}
```

### RelatedContent

```typescript
class RelatedContentService {
  // Get related items
  getRelatedItems(options: RelatedContentOptions): Promise<RelatedItem[]>;
  
  // Cache control
  clearCache(): void;
  prefetchRelated(itemIds: string[]): Promise<void>;
}

interface RelatedContentOptions {
  itemId: string;
  limit?: number;
  minSimilarity?: number;
  includeTypes?: Array<'scheme' | 'exam' | 'job' | 'startup'>;
}

interface RelatedItem {
  id: string;
  title: string;
  type: string;
  category: string;
  similarity: number;
  reason: string;
  deadline?: string;
  tags?: string[];
}
```

### ViewingHistory

```typescript
class ViewingHistoryTracker {
  // Track views
  trackView(userId: string, itemId: string, itemType: string, 
            itemTitle: string, itemCategory: string, source?: string): Promise<void>;
  trackViewEnd(userId: string, itemId: string): Promise<void>;
  
  // Get history
  getRecentlyViewed(userId: string, limit?: number): Promise<RecentlyViewedItem[]>;
  
  // Analytics
  getItemViewStats(itemId: string): Promise<{
    totalViews: number;
    uniqueViewers: number;
    averageTimeSpent: number;
  }>;
  
  // Privacy
  clearHistory(userId: string): Promise<void>;
  clearAllCaches(): void;
}

interface RecentlyViewedItem {
  id: string;
  title: string;
  type: string;
  category: string;
  viewedAt: string;
  timeSpent?: number;
}
```

### TrendingService

```typescript
class TrendingService {
  // Get trending items
  getTrending(options?: TrendingOptions): Promise<TrendingItem[]>;
  
  // Get trending metadata
  getTrendingCategories(limit?: number): Promise<Array<{
    category: string;
    itemCount: number;
    totalActivity: number;
  }>>;
  
  getTrendingTags(limit?: number): Promise<Array<{
    tag: string;
    count: number;
    score: number;
  }>>;
  
  // Check if trending
  isItemTrending(itemId: string): Promise<boolean>;
  
  // Cache control
  refresh(): Promise<void>;
  clearCache(): void;
}

interface TrendingOptions {
  timeWindow?: 'day' | 'week' | 'month';
  limit?: number;
  category?: string;
  type?: 'scheme' | 'exam' | 'job' | 'startup';
}

interface TrendingItem {
  id: string;
  title: string;
  type: string;
  category: string;
  trendingScore: number;
  viewCount: number;
  applicationCount: number;
  growthRate: number;
  deadline?: string;
  tags?: string[];
}
```

---

## Database Schema

### view_history

```sql
CREATE TABLE view_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_title TEXT NOT NULL,
  item_category TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent INTEGER, -- seconds
  source TEXT, -- 'search', 'discover', 'recommendation', 'direct'
  UNIQUE(user_id, item_id, viewed_at)
);

CREATE INDEX idx_view_history_user ON view_history(user_id, viewed_at DESC);
CREATE INDEX idx_view_history_item ON view_history(item_id);
```

---

## Performance

### Caching Strategy

| Service | Cache TTL | Strategy |
|---------|-----------|----------|
| Recommendations | In-memory | Per-user profile cache |
| Related Content | 5 minutes | Per-item cache |
| Trending | 15 minutes | Global cache |
| View History | Session | LocalStorage + DB |

### Optimization Tips

1. **Prefetch related items**
   ```typescript
   await relatedContent.prefetchRelated(['id1', 'id2', 'id3']);
   ```

2. **Limit recommendation requests**
   ```typescript
   // Use reasonable limits
   getPersonalizedRecommendations({ limit: 20 }); // ✅
   getPersonalizedRecommendations({ limit: 100 }); // ❌
   ```

3. **Clear caches periodically**
   ```typescript
   // Clear old caches every hour
   setInterval(() => {
     recommendationEngine.clearAllCaches();
     trendingService.clearCache();
   }, 60 * 60 * 1000);
   ```

---

## Browser Support

All features work on modern browsers:

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Web Share API | ✅ 89+ | ✅ 71+ | ✅ 15+ | ✅ 93+ |
| Clipboard API | ✅ 63+ | ✅ 53+ | ✅ 13.1+ | ✅ 79+ |
| LocalStorage | ✅ All | ✅ All | ✅ All | ✅ All |

**Graceful degradation:**
- No Web Share API → Copy link fallback
- No Clipboard API → Manual copy fallback

---

## Security & Privacy

### User Data

✅ **View history** - Stored per-user, can be cleared  
✅ **Recommendations** - Based on anonymized patterns  
✅ **Share tracking** - Anonymous analytics only  
✅ **Privacy controls** - Clear history anytime  

### Data Retention

- View history: 90 days (configurable)
- Share analytics: 30 days
- Cache: Automatic expiry

---

**Implementation Date**: 2025-10-28  
**Status**: ✅ Complete and Production Ready  
**Breaking Changes**: None  

Enjoy intelligent discovery features! 🔍✨
