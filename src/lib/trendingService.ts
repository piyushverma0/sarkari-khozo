import { supabase } from '@/integrations/supabase/client';

/**
 * Trending Service
 * 
 * Calculates and manages trending schemes/exams based on recent activity.
 */

export interface TrendingItem {
  id: string;
  title: string;
  type: 'scheme' | 'exam' | 'job' | 'startup';
  category: string;
  trendingScore: number;
  viewCount: number;
  applicationCount: number;
  growthRate: number;
  deadline?: string;
  tags?: string[];
}

export interface TrendingOptions {
  timeWindow?: 'day' | 'week' | 'month';
  limit?: number;
  category?: string;
  type?: 'scheme' | 'exam' | 'job' | 'startup';
}

class TrendingService {
  private static instance: TrendingService;
  private cache: Map<string, TrendingItem[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  private constructor() {}

  static getInstance(): TrendingService {
    if (!TrendingService.instance) {
      TrendingService.instance = new TrendingService();
    }
    return TrendingService.instance;
  }

  /**
   * Get trending items
   */
  async getTrending(options: TrendingOptions = {}): Promise<TrendingItem[]> {
    const {
      timeWindow = 'week',
      limit = 10,
      category,
      type,
    } = options;

    const cacheKey = `${timeWindow}-${category || 'all'}-${type || 'all'}`;

    // Check cache
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached.slice(0, limit);
    }

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeWindow) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // Fetch items with recent activity
      const items = await this.fetchItemsWithActivity(startDate, endDate, category, type);

      // Calculate trending scores
      const scored = items.map(item => ({
        ...item,
        trendingScore: this.calculateTrendingScore(item, timeWindow),
        growthRate: this.calculateGrowthRate(item, timeWindow),
      }));

      // Sort by trending score
      const trending = scored
        .filter(item => item.trendingScore > 0)
        .sort((a, b) => b.trendingScore - a.trendingScore);

      // Cache results
      this.setCached(cacheKey, trending);

      return trending.slice(0, limit);
    } catch (error) {
      console.error('Error getting trending items:', error);
      return [];
    }
  }

  /**
   * Fetch items with recent activity
   */
  private async fetchItemsWithActivity(
    startDate: Date,
    endDate: Date,
    category?: string,
    type?: string
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('applications')
        .select('id, title, type, category, tags, deadline, view_count, application_count, created_at')
        .gte('deadline', new Date().toISOString())
        .order('view_count', { ascending: false })
        .limit(100);

      if (category) {
        query = query.eq('category', category);
      }

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching items with activity:', error);
      return [];
    }
  }

  /**
   * Calculate trending score
   * Uses a modified Wilson score with time decay
   */
  private calculateTrendingScore(item: any, timeWindow: string): number {
    const viewCount = item.view_count || 0;
    const applicationCount = item.application_count || 0;
    
    // Weight applications more than views
    const totalActivity = viewCount + (applicationCount * 5);

    // Calculate age in hours
    const ageInHours = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60);

    // Time decay factor (newer items get boost)
    const decayRate = timeWindow === 'day' ? 0.5 : timeWindow === 'week' ? 0.2 : 0.1;
    const timeFactor = Math.exp(-decayRate * ageInHours / 24);

    // Deadline urgency factor
    let urgencyFactor = 1;
    if (item.deadline) {
      const daysUntilDeadline = (new Date(item.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilDeadline > 0 && daysUntilDeadline <= 7) {
        urgencyFactor = 1.5; // Boost items with urgent deadlines
      }
    }

    // Calculate score
    const score = (totalActivity * timeFactor * urgencyFactor) / Math.log10(ageInHours + 2);

    return Math.max(0, score);
  }

  /**
   * Calculate growth rate
   */
  private calculateGrowthRate(item: any, timeWindow: string): number {
    // This is simplified - in production, compare with previous period
    const viewCount = item.view_count || 0;
    const applicationCount = item.application_count || 0;
    
    const ageInDays = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays < 1) return 100; // New items get 100% growth

    const dailyAverage = (viewCount + applicationCount * 5) / ageInDays;
    
    // Compare to expected average (this is simplified)
    const expectedAverage = 10;
    const growthRate = ((dailyAverage - expectedAverage) / expectedAverage) * 100;

    return Math.max(-100, Math.min(growthRate, 1000));
  }

  /**
   * Get trending categories
   */
  async getTrendingCategories(limit: number = 5): Promise<Array<{
    category: string;
    itemCount: number;
    totalActivity: number;
  }>> {
    try {
      // This would ideally use a database view or materialized view
      const { data, error } = await supabase
        .from('applications')
        .select('category, view_count, application_count')
        .gte('deadline', new Date().toISOString());

      if (error) throw error;

      // Group by category
      const categoryMap = new Map<string, { count: number; activity: number }>();

      (data || []).forEach(item => {
        const existing = categoryMap.get(item.category) || { count: 0, activity: 0 };
        existing.count++;
        existing.activity += (item.view_count || 0) + (item.application_count || 0) * 5;
        categoryMap.set(item.category, existing);
      });

      // Convert to array and sort
      const categories = Array.from(categoryMap.entries())
        .map(([category, stats]) => ({
          category,
          itemCount: stats.count,
          totalActivity: stats.activity,
        }))
        .sort((a, b) => b.totalActivity - a.totalActivity)
        .slice(0, limit);

      return categories;
    } catch (error) {
      console.error('Error getting trending categories:', error);
      return [];
    }
  }

  /**
   * Get trending tags
   */
  async getTrendingTags(limit: number = 10): Promise<Array<{
    tag: string;
    count: number;
    score: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('tags, view_count, application_count')
        .gte('deadline', new Date().toISOString())
        .not('tags', 'is', null);

      if (error) throw error;

      // Flatten and count tags
      const tagMap = new Map<string, { count: number; totalActivity: number }>();

      (data || []).forEach(item => {
        const tags = item.tags || [];
        const activity = (item.view_count || 0) + (item.application_count || 0) * 5;

        tags.forEach((tag: string) => {
          const existing = tagMap.get(tag) || { count: 0, totalActivity: 0 };
          existing.count++;
          existing.totalActivity += activity;
          tagMap.set(tag, existing);
        });
      });

      // Convert to array and sort
      const tags = Array.from(tagMap.entries())
        .map(([tag, stats]) => ({
          tag,
          count: stats.count,
          score: stats.totalActivity / stats.count,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return tags;
    } catch (error) {
      console.error('Error getting trending tags:', error);
      return [];
    }
  }

  /**
   * Check if an item is trending
   */
  async isItemTrending(itemId: string): Promise<boolean> {
    const trending = await this.getTrending({ limit: 50 });
    return trending.some(item => item.id === itemId);
  }

  /**
   * Get cached results
   */
  private getCached(key: string): TrendingItem[] | null {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || expiry < Date.now()) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }

    return this.cache.get(key) || null;
  }

  /**
   * Set cache
   */
  private setCached(key: string, items: TrendingItem[]): void {
    this.cache.set(key, items);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Refresh trending data
   */
  async refresh(): Promise<void> {
    this.clearCache();
    await this.getTrending();
  }
}

// Export singleton
export const trendingService = TrendingService.getInstance();
