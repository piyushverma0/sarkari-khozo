/**
 * Recommendation Engine - Stub Implementation
 * Returns empty recommendations until proper database schema is in place
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

class RecommendationEngine {
  private static instance: RecommendationEngine;

  private constructor() {}

  static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  async getPersonalizedRecommendations(
    context: RecommendationContext
  ): Promise<RecommendationItem[]> {
    // Stub implementation - returns empty array
    console.log('RecommendationEngine: Returning empty recommendations (stub)');
    return [];
  }
}

export const recommendationEngine = RecommendationEngine.getInstance();
