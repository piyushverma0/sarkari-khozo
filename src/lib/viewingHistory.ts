/**
 * Viewing History Service - Stub Implementation
 * Returns empty viewing history until proper database schema is in place
 */

export interface RecentlyViewedItem {
  id: string;
  title: string;
  type: 'scheme' | 'exam' | 'job' | 'startup';
  category: string;
  viewedAt: string;
  timeSpent?: number;
}

class ViewingHistoryService {
  private static instance: ViewingHistoryService;

  private constructor() {}

  static getInstance(): ViewingHistoryService {
    if (!ViewingHistoryService.instance) {
      ViewingHistoryService.instance = new ViewingHistoryService();
    }
    return ViewingHistoryService.instance;
  }

  async trackView(
    userId: string,
    itemId: string,
    itemType: string,
    itemTitle: string,
    itemCategory: string,
    source?: string
  ): Promise<void> {
    // Stub implementation - does nothing
    console.log('ViewingHistoryService: Tracking view (stub)', { userId, itemId });
  }

  async getRecentlyViewed(
    userId: string,
    limit: number = 10
  ): Promise<RecentlyViewedItem[]> {
    // Stub implementation - returns empty array
    console.log('ViewingHistoryService: Returning empty recent views (stub)');
    return [];
  }

  async clearHistory(userId: string): Promise<void> {
    // Stub implementation - does nothing
    console.log('ViewingHistoryService: Clearing history (stub)', { userId });
  }
}

export const viewingHistory = ViewingHistoryService.getInstance();
