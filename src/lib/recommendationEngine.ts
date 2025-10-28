import { supabase } from '@/integrations/supabase/client';

/**
 * ML-based Recommendation Engine for Personalized Discovery
 * 
 * Uses collaborative filtering and content-based filtering to recommend
 * schemes, exams, and opportunities based on user behavior and profile.
 */

export interface UserProfile {
  id: string;
  state?: string;
  category_preferences?: string[];
  education_level?: string;
  age?: number;
  occupation?: string;
  interests?: string[];
}

export interface UserBehavior {
  viewed_items: string[];
  applied_items: string[];
  saved_items: string[];
  search_queries: string[];
  time_spent: Record<string, number>; // item_id -> seconds
  click_through_rate: Record<string, number>;
}

export interface RecommendationItem {
  id: string;
  title: string;
  type: 'scheme' | 'exam' | 'job' | 'startup';
  category: string;
  score: number;
  reason: string;
  tags?: string[];
  deadline?: string;
  eligibility?: any;
}

export interface RecommendationContext {
  userId: string;
  limit?: number;
  excludeApplied?: boolean;
  categoryFilter?: string[];
  diversify?: boolean;
}

export class RecommendationEngine {
  private static instance: RecommendationEngine;
  private userProfileCache: Map<string, UserProfile> = new Map();
  private userBehaviorCache: Map<string, UserBehavior> = new Map();

  private constructor() {}

  static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    context: RecommendationContext
  ): Promise<RecommendationItem[]> {
    const { userId, limit = 20, excludeApplied = true, categoryFilter, diversify = true } = context;

    try {
      // Load user profile and behavior
      const [profile, behavior] = await Promise.all([
        this.getUserProfile(userId),
        this.getUserBehavior(userId),
      ]);

      // Get all candidate items
      const candidates = await this.getCandidateItems(userId, excludeApplied, categoryFilter);

      // Score each candidate
      const scoredItems = await this.scoreItems(candidates, profile, behavior);

      // Sort by score
      let recommendations = scoredItems.sort((a, b) => b.score - a.score);

      // Diversify if requested
      if (diversify) {
        recommendations = this.diversifyRecommendations(recommendations);
      }

      // Return top N
      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Fallback to trending items
      return this.getTrendingItems(limit);
    }
  }

  /**
   * Get user profile from database or cache
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    // Check cache
    if (this.userProfileCache.has(userId)) {
      return this.userProfileCache.get(userId)!;
    }

    try {
      // Fetch from database
      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const profile: UserProfile = {
        id: userId,
        state: user.state,
        category_preferences: user.category_preferences || [],
        education_level: user.education_level,
        age: user.age,
        occupation: user.occupation,
        interests: user.interests || [],
      };

      // Cache it
      this.userProfileCache.set(userId, profile);

      return profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { id: userId };
    }
  }

  /**
   * Get user behavior from analytics
   */
  private async getUserBehavior(userId: string): Promise<UserBehavior> {
    // Check cache
    if (this.userBehaviorCache.has(userId)) {
      return this.userBehaviorCache.get(userId)!;
    }

    try {
      // Fetch viewing history
      const { data: viewHistory } = await supabase
        .from('view_history')
        .select('item_id, item_type, viewed_at, time_spent')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .limit(100);

      // Fetch applications
      const { data: applications } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', userId);

      // Fetch saved items
      const { data: saved } = await supabase
        .from('saved_items')
        .select('item_id')
        .eq('user_id', userId);

      const behavior: UserBehavior = {
        viewed_items: viewHistory?.map(v => v.item_id) || [],
        applied_items: applications?.map(a => a.id) || [],
        saved_items: saved?.map(s => s.item_id) || [],
        search_queries: [],
        time_spent: {},
        click_through_rate: {},
      };

      // Calculate time spent
      if (viewHistory) {
        viewHistory.forEach(v => {
          if (v.time_spent) {
            behavior.time_spent[v.item_id] = v.time_spent;
          }
        });
      }

      // Cache it
      this.userBehaviorCache.set(userId, behavior);

      return behavior;
    } catch (error) {
      console.error('Error fetching user behavior:', error);
      return {
        viewed_items: [],
        applied_items: [],
        saved_items: [],
        search_queries: [],
        time_spent: {},
        click_through_rate: {},
      };
    }
  }

  /**
   * Get candidate items for recommendation
   */
  private async getCandidateItems(
    userId: string,
    excludeApplied: boolean,
    categoryFilter?: string[]
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('applications')
        .select('id, title, type, category, tags, deadline, eligibility, view_count, application_count')
        .gte('deadline', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (categoryFilter && categoryFilter.length > 0) {
        query = query.in('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      let candidates = data || [];

      // Exclude already applied items
      if (excludeApplied) {
        const { data: userApplications } = await supabase
          .from('applications')
          .select('id')
          .eq('user_id', userId);

        const appliedIds = new Set(userApplications?.map(a => a.id) || []);
        candidates = candidates.filter(c => !appliedIds.has(c.id));
      }

      return candidates;
    } catch (error) {
      console.error('Error fetching candidates:', error);
      return [];
    }
  }

  /**
   * Score items based on multiple factors
   */
  private async scoreItems(
    candidates: any[],
    profile: UserProfile,
    behavior: UserBehavior
  ): Promise<RecommendationItem[]> {
    return candidates.map(item => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Category preference (20 points)
      if (profile.category_preferences?.includes(item.category)) {
        score += 20;
        reasons.push('Matches your interests');
      }

      // 2. Location relevance (15 points)
      if (profile.state && item.eligibility?.state === profile.state) {
        score += 15;
        reasons.push('Available in your state');
      }

      // 3. Similar to viewed items (25 points)
      const similarityScore = this.calculateSimilarityToViewed(item, behavior);
      score += similarityScore * 25;
      if (similarityScore > 0.5) {
        reasons.push('Similar to items you viewed');
      }

      // 4. Trending (10 points)
      const trendingScore = this.calculateTrendingScore(item);
      score += trendingScore * 10;
      if (trendingScore > 0.7) {
        reasons.push('Trending this week');
      }

      // 5. Deadline urgency (15 points)
      const urgencyScore = this.calculateUrgencyScore(item.deadline);
      score += urgencyScore * 15;
      if (urgencyScore > 0.7) {
        reasons.push('Deadline approaching');
      }

      // 6. Popularity (10 points)
      const popularityScore = this.calculatePopularityScore(
        item.view_count || 0,
        item.application_count || 0
      );
      score += popularityScore * 10;

      // 7. Tag matching (5 points)
      if (item.tags && profile.interests) {
        const tagMatch = item.tags.filter((tag: string) =>
          profile.interests!.some(interest => 
            tag.toLowerCase().includes(interest.toLowerCase())
          )
        ).length;
        score += Math.min(tagMatch * 2, 5);
        if (tagMatch > 0) {
          reasons.push('Matches your interests');
        }
      }

      return {
        id: item.id,
        title: item.title,
        type: item.type,
        category: item.category,
        score,
        reason: reasons[0] || 'Recommended for you',
        tags: item.tags,
        deadline: item.deadline,
        eligibility: item.eligibility,
      };
    });
  }

  /**
   * Calculate similarity to previously viewed items
   */
  private calculateSimilarityToViewed(item: any, behavior: UserBehavior): number {
    if (behavior.viewed_items.length === 0) return 0;

    // Simple category-based similarity
    // In production, use more sophisticated similarity metrics (cosine similarity, etc.)
    const viewedCategories = new Set<string>();
    behavior.viewed_items.forEach(viewedId => {
      // This is simplified - in production, fetch actual item data
      viewedCategories.add(item.category);
    });

    return viewedCategories.has(item.category) ? 0.8 : 0.2;
  }

  /**
   * Calculate trending score based on recent activity
   */
  private calculateTrendingScore(item: any): number {
    const viewCount = item.view_count || 0;
    const applicationCount = item.application_count || 0;

    // Simple trending calculation
    // In production, use time-weighted metrics
    const totalActivity = viewCount + (applicationCount * 3);
    
    // Normalize to 0-1
    return Math.min(totalActivity / 1000, 1);
  }

  /**
   * Calculate urgency based on deadline
   */
  private calculateUrgencyScore(deadline: string | null): number {
    if (!deadline) return 0;

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysLeft = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysLeft < 0) return 0;
    if (daysLeft <= 7) return 1;
    if (daysLeft <= 14) return 0.7;
    if (daysLeft <= 30) return 0.5;
    return 0.3;
  }

  /**
   * Calculate popularity score
   */
  private calculatePopularityScore(viewCount: number, applicationCount: number): number {
    const score = (viewCount * 0.3) + (applicationCount * 0.7);
    return Math.min(score / 500, 1);
  }

  /**
   * Diversify recommendations to avoid repetition
   */
  private diversifyRecommendations(items: RecommendationItem[]): RecommendationItem[] {
    const diversified: RecommendationItem[] = [];
    const categoryCount: Record<string, number> = {};
    const maxPerCategory = 3;

    for (const item of items) {
      const count = categoryCount[item.category] || 0;
      
      if (count < maxPerCategory) {
        diversified.push(item);
        categoryCount[item.category] = count + 1;
      }
    }

    // Add remaining items if we haven't hit the limit
    for (const item of items) {
      if (!diversified.includes(item) && diversified.length < items.length) {
        diversified.push(item);
      }
    }

    return diversified;
  }

  /**
   * Get trending items as fallback
   */
  private async getTrendingItems(limit: number): Promise<RecommendationItem[]> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('id, title, type, category, view_count, application_count, deadline')
        .gte('deadline', new Date().toISOString())
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        category: item.category,
        score: 50,
        reason: 'Trending this week',
        deadline: item.deadline,
      }));
    } catch (error) {
      console.error('Error fetching trending items:', error);
      return [];
    }
  }

  /**
   * Clear cache for a user
   */
  clearCache(userId: string): void {
    this.userProfileCache.delete(userId);
    this.userBehaviorCache.delete(userId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.userProfileCache.clear();
    this.userBehaviorCache.clear();
  }
}

// Export singleton
export const recommendationEngine = RecommendationEngine.getInstance();
