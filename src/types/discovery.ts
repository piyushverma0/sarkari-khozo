export interface DiscoveryStory {
  id: string;
  headline: string;
  summary: string;
  excerpt: string;
  source_url: string;
  source_name: string;
  published_date: string;
  category: 'exams' | 'jobs' | 'schemes' | 'policies';
  subcategory?: string;
  tags: string[];
  region: string;
  states: string[];
  image_url?: string;
  image_alt?: string;
  relevance_score: number;
  view_count: number;
  save_count: number;
  share_count: number;
  click_count: number;
  impact_statement?: string;
  key_takeaways: string[];
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedFilters {
  category: 'all' | 'exams' | 'jobs' | 'schemes' | 'policies';
  region?: string;
  sort: 'relevance' | 'recent' | 'trending';
}

export interface FeedPagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
