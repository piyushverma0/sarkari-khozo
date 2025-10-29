import { supabase } from '@/integrations/supabase/client';

/**
 * Related Content System
 * 
 * Finds similar schemes, exams, and opportunities based on content similarity.
 */

export interface RelatedItem {
  id: string;
  title: string;
  type: 'scheme' | 'exam' | 'job' | 'startup';
  category: string;
  similarity: number;
  reason: string;
  deadline?: string;
  tags?: string[];
}

export interface RelatedContentOptions {
  itemId: string;
  limit?: number;
  minSimilarity?: number;
  includeTypes?: Array<'scheme' | 'exam' | 'job' | 'startup'>;
}

class RelatedContentService {
  private static instance: RelatedContentService;
  private cache: Map<string, RelatedItem[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): RelatedContentService {
    if (!RelatedContentService.instance) {
      RelatedContentService.instance = new RelatedContentService();
    }
    return RelatedContentService.instance;
  }

  /**
   * Get related items for a given item
   */
  async getRelatedItems(options: RelatedContentOptions): Promise<RelatedItem[]> {
    const {
      itemId,
      limit = 6,
      minSimilarity = 0.3,
      includeTypes = ['scheme', 'exam', 'job', 'startup'],
    } = options;

    // Check cache
    const cached = this.getCached(itemId);
    if (cached) {
      return cached.slice(0, limit);
    }

    try {
      // Fetch the source item
      const sourceItem = await this.getItem(itemId);
      if (!sourceItem) return [];

      // Find related items
      const related = await this.findRelated(sourceItem, includeTypes);

      // Calculate similarity scores
      const scored = related.map(item => ({
        ...item,
        similarity: this.calculateSimilarity(sourceItem, item),
        reason: this.getRelationReason(sourceItem, item),
      }));

      // Filter by minimum similarity and sort
      const filtered = scored
        .filter(item => item.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity);

      // Cache results
      this.setCached(itemId, filtered);

      return filtered.slice(0, limit);
    } catch (error) {
      console.error('Error getting related items:', error);
      return [];
    }
  }

  /**
   * Get an item by ID
   */
  private async getItem(itemId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching item:', error);
      return null;
    }
  }

  /**
   * Find potentially related items
   */
  private async findRelated(
    sourceItem: any,
    includeTypes: string[]
  ): Promise<any[]> {
    try {
      // Query for similar items
      let query = supabase
        .from('applications')
        .select('id, title, type, category, tags, deadline, eligibility, description')
        .neq('id', sourceItem.id)
        .in('type', includeTypes)
        .gte('deadline', new Date().toISOString())
        .limit(50);

      // Filter by same category first
      const { data: sameCategory } = await query.eq('category', sourceItem.category);

      // Also get items from similar categories
      const { data: otherCategories } = await query.neq('category', sourceItem.category);

      return [...(sameCategory || []), ...(otherCategories || [])];
    } catch (error) {
      console.error('Error finding related items:', error);
      return [];
    }
  }

  /**
   * Calculate similarity between two items
   */
  private calculateSimilarity(sourceItem: any, targetItem: any): number {
    let score = 0;

    // 1. Category match (30%)
    if (sourceItem.category === targetItem.category) {
      score += 0.3;
    }

    // 2. Type match (10%)
    if (sourceItem.type === targetItem.type) {
      score += 0.1;
    }

    // 3. Tag overlap (30%)
    const tagScore = this.calculateTagSimilarity(
      sourceItem.tags || [],
      targetItem.tags || []
    );
    score += tagScore * 0.3;

    // 4. Title similarity (20%)
    const titleScore = this.calculateTextSimilarity(
      sourceItem.title,
      targetItem.title
    );
    score += titleScore * 0.2;

    // 5. Eligibility similarity (10%)
    const eligibilityScore = this.calculateEligibilitySimilarity(
      sourceItem.eligibility,
      targetItem.eligibility
    );
    score += eligibilityScore * 0.1;

    return Math.min(score, 1);
  }

  /**
   * Calculate tag similarity using Jaccard index
   */
  private calculateTagSimilarity(tags1: string[], tags2: string[]): number {
    if (tags1.length === 0 || tags2.length === 0) return 0;

    const set1 = new Set(tags1.map(t => t.toLowerCase()));
    const set2 = new Set(tags2.map(t => t.toLowerCase()));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate text similarity (simple word overlap)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(
      text1
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
    );
    const words2 = new Set(
      text2
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
    );

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    return intersection.size / Math.max(words1.size, words2.size);
  }

  /**
   * Calculate eligibility similarity
   */
  private calculateEligibilitySimilarity(elig1: any, elig2: any): number {
    if (!elig1 || !elig2) return 0;

    let matches = 0;
    let total = 0;

    // Compare common fields
    const fields = ['state', 'age_min', 'age_max', 'education', 'gender'];
    
    fields.forEach(field => {
      if (elig1[field] !== undefined && elig2[field] !== undefined) {
        total++;
        if (elig1[field] === elig2[field]) {
          matches++;
        }
      }
    });

    return total > 0 ? matches / total : 0;
  }

  /**
   * Get reason for relation
   */
  private getRelationReason(sourceItem: any, targetItem: any): string {
    if (sourceItem.category === targetItem.category) {
      return `Same category: ${sourceItem.category}`;
    }

    const commonTags = this.getCommonTags(
      sourceItem.tags || [],
      targetItem.tags || []
    );
    
    if (commonTags.length > 0) {
      return `Similar: ${commonTags[0]}`;
    }

    if (sourceItem.type === targetItem.type) {
      return `Similar ${sourceItem.type}`;
    }

    return 'You might be interested';
  }

  /**
   * Get common tags
   */
  private getCommonTags(tags1: string[], tags2: string[]): string[] {
    const set1 = new Set(tags1.map(t => t.toLowerCase()));
    const set2 = new Set(tags2.map(t => t.toLowerCase()));
    return [...set1].filter(t => set2.has(t));
  }

  /**
   * Get cached results
   */
  private getCached(itemId: string): RelatedItem[] | null {
    const expiry = this.cacheExpiry.get(itemId);
    if (!expiry || expiry < Date.now()) {
      this.cache.delete(itemId);
      this.cacheExpiry.delete(itemId);
      return null;
    }

    return this.cache.get(itemId) || null;
  }

  /**
   * Set cache
   */
  private setCached(itemId: string, items: RelatedItem[]): void {
    this.cache.set(itemId, items);
    this.cacheExpiry.set(itemId, Date.now() + this.CACHE_TTL);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Prefetch related items
   */
  async prefetchRelated(itemIds: string[]): Promise<void> {
    const promises = itemIds.map(itemId =>
      this.getRelatedItems({ itemId, limit: 6 })
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Error prefetching related items:', error);
    }
  }
}

// Export singleton
export const relatedContent = RelatedContentService.getInstance();
