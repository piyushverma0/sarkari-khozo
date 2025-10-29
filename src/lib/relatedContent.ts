/**
 * Related Content Service - Stub Implementation
 * Returns empty related items until proper database schema is in place
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

  private constructor() {}

  static getInstance(): RelatedContentService {
    if (!RelatedContentService.instance) {
      RelatedContentService.instance = new RelatedContentService();
    }
    return RelatedContentService.instance;
  }

  async getRelatedItems(options: RelatedContentOptions): Promise<RelatedItem[]> {
    // Stub implementation - returns empty array
    console.log('RelatedContentService: Returning empty related items (stub)');
    return [];
  }
}

export const relatedContent = RelatedContentService.getInstance();
