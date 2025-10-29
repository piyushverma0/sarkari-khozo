/**
 * Trending Service - Stub Implementation
 * Returns empty trending items until proper database schema is in place
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

  private constructor() {}

  static getInstance(): TrendingService {
    if (!TrendingService.instance) {
      TrendingService.instance = new TrendingService();
    }
    return TrendingService.instance;
  }

  async getTrending(options: TrendingOptions = {}): Promise<TrendingItem[]> {
    // Stub implementation - returns empty array
    console.log('TrendingService: Returning empty trending items (stub)');
    return [];
  }
}

export const trendingService = TrendingService.getInstance();
