import { supabase } from '@/integrations/supabase/client';

/**
 * Viewing History Tracker
 * 
 * Tracks user viewing behavior for recommendations and recently viewed features.
 */

export interface ViewHistoryItem {
  id: string;
  user_id: string;
  item_id: string;
  item_type: 'scheme' | 'exam' | 'job' | 'startup';
  item_title: string;
  item_category: string;
  viewed_at: string;
  time_spent?: number;
  source?: 'search' | 'discover' | 'recommendation' | 'direct';
}

export interface RecentlyViewedItem {
  id: string;
  title: string;
  type: string;
  category: string;
  viewedAt: string;
  timeSpent?: number;
}

class ViewingHistoryTracker {
  private static instance: ViewingHistoryTracker;
  private activeViews: Map<string, { startTime: number; itemId: string }> = new Map();
  private localCache: Map<string, RecentlyViewedItem[]> = new Map();

  private constructor() {
    // Cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushActiveViews();
      });
    }
  }

  static getInstance(): ViewingHistoryTracker {
    if (!ViewingHistoryTracker.instance) {
      ViewingHistoryTracker.instance = new ViewingHistoryTracker();
    }
    return ViewingHistoryTracker.instance;
  }

  /**
   * Track when user starts viewing an item
   */
  async trackView(
    userId: string,
    itemId: string,
    itemType: 'scheme' | 'exam' | 'job' | 'startup',
    itemTitle: string,
    itemCategory: string,
    source?: 'search' | 'discover' | 'recommendation' | 'direct'
  ): Promise<void> {
    try {
      // Store start time for time tracking
      const key = `${userId}-${itemId}`;
      this.activeViews.set(key, {
        startTime: Date.now(),
        itemId,
      });

      // Record view in database
      const { error } = await supabase.from('view_history').insert({
        user_id: userId,
        item_id: itemId,
        item_type: itemType,
        item_title: itemTitle,
        item_category: itemCategory,
        viewed_at: new Date().toISOString(),
        source: source || 'direct',
      });

      if (error && error.code !== '23505') {
        // Ignore duplicate key errors
        console.error('Error tracking view:', error);
      }

      // Update local cache
      this.updateLocalCache(userId, {
        id: itemId,
        title: itemTitle,
        type: itemType,
        category: itemCategory,
        viewedAt: new Date().toISOString(),
      });

      // Increment view count
      await this.incrementViewCount(itemId, itemType);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }

  /**
   * Track when user stops viewing an item
   */
  async trackViewEnd(userId: string, itemId: string): Promise<void> {
    try {
      const key = `${userId}-${itemId}`;
      const activeView = this.activeViews.get(key);

      if (!activeView) return;

      const timeSpent = Math.floor((Date.now() - activeView.startTime) / 1000); // seconds

      // Update time spent in database
      const { error } = await supabase
        .from('view_history')
        .update({ time_spent: timeSpent })
        .eq('user_id', userId)
        .eq('item_id', itemId)
        .order('viewed_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error updating time spent:', error);
      }

      // Remove from active views
      this.activeViews.delete(key);
    } catch (error) {
      console.error('Error tracking view end:', error);
    }
  }

  /**
   * Get recently viewed items for a user
   */
  async getRecentlyViewed(userId: string, limit: number = 10): Promise<RecentlyViewedItem[]> {
    try {
      // Check cache first
      const cached = this.localCache.get(userId);
      if (cached && cached.length > 0) {
        return cached.slice(0, limit);
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('view_history')
        .select('item_id, item_title, item_type, item_category, viewed_at, time_spent')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const items: RecentlyViewedItem[] = (data || []).map(item => ({
        id: item.item_id,
        title: item.item_title,
        type: item.item_type,
        category: item.item_category,
        viewedAt: item.viewed_at,
        timeSpent: item.time_spent,
      }));

      // Update cache
      this.localCache.set(userId, items);

      return items;
    } catch (error) {
      console.error('Error fetching recently viewed:', error);
      return [];
    }
  }

  /**
   * Get view statistics for an item
   */
  async getItemViewStats(itemId: string): Promise<{
    totalViews: number;
    uniqueViewers: number;
    averageTimeSpent: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('view_history')
        .select('user_id, time_spent')
        .eq('item_id', itemId);

      if (error) throw error;

      const totalViews = data?.length || 0;
      const uniqueViewers = new Set(data?.map(v => v.user_id)).size;
      const averageTimeSpent =
        data?.reduce((sum, v) => sum + (v.time_spent || 0), 0) / totalViews || 0;

      return {
        totalViews,
        uniqueViewers,
        averageTimeSpent,
      };
    } catch (error) {
      console.error('Error fetching view stats:', error);
      return {
        totalViews: 0,
        uniqueViewers: 0,
        averageTimeSpent: 0,
      };
    }
  }

  /**
   * Clear viewing history for a user
   */
  async clearHistory(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('view_history')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Clear cache
      this.localCache.delete(userId);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  }

  /**
   * Update local cache
   */
  private updateLocalCache(userId: string, item: RecentlyViewedItem): void {
    const cached = this.localCache.get(userId) || [];
    
    // Remove if already exists
    const filtered = cached.filter(i => i.id !== item.id);
    
    // Add to front
    filtered.unshift(item);
    
    // Keep only last 20
    this.localCache.set(userId, filtered.slice(0, 20));
  }

  /**
   * Increment view count for an item
   */
  private async incrementViewCount(
    itemId: string,
    itemType: 'scheme' | 'exam' | 'job' | 'startup'
  ): Promise<void> {
    try {
      // This would update a view_count column in the applications table
      const { error } = await supabase.rpc('increment_view_count', {
        item_id: itemId,
      });

      if (error && error.code !== 'PGRST202') {
        // Ignore if function doesn't exist
        console.debug('View count increment not available:', error.message);
      }
    } catch (error) {
      console.debug('Error incrementing view count:', error);
    }
  }

  /**
   * Flush all active views (called on page unload)
   */
  private flushActiveViews(): void {
    this.activeViews.forEach((view, key) => {
      const [userId, itemId] = key.split('-');
      this.trackViewEnd(userId, itemId);
    });
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.localCache.clear();
    this.activeViews.clear();
  }
}

// Export singleton
export const viewingHistory = ViewingHistoryTracker.getInstance();
