-- Create discovery_stories table
CREATE TABLE discovery_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Content
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  full_content TEXT,
  excerpt TEXT,
  
  -- Source Information
  source_url TEXT NOT NULL UNIQUE,
  source_name TEXT,
  published_date TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Categorization
  category TEXT NOT NULL CHECK (category IN ('exams', 'jobs', 'schemes', 'policies')),
  subcategory TEXT,
  tags TEXT[],
  
  -- Geographic Targeting
  region TEXT DEFAULT 'National',
  states TEXT[],
  
  -- Media
  image_url TEXT,
  image_alt TEXT,
  
  -- Relevance & Engagement
  relevance_score INTEGER DEFAULT 5 CHECK (relevance_score >= 0 AND relevance_score <= 10),
  view_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  
  -- Impact
  impact_statement TEXT,
  key_takeaways TEXT[],
  
  -- Metadata
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes for discovery_stories
CREATE INDEX idx_stories_category ON discovery_stories(category) WHERE is_active = TRUE;
CREATE INDEX idx_stories_region ON discovery_stories(region) WHERE is_active = TRUE;
CREATE INDEX idx_stories_published ON discovery_stories(published_date DESC) WHERE is_active = TRUE;
CREATE INDEX idx_stories_relevance ON discovery_stories(relevance_score DESC, published_date DESC) WHERE is_active = TRUE;
CREATE INDEX idx_stories_trending ON discovery_stories((view_count + save_count*3 + share_count*5) DESC) WHERE is_active = TRUE;
CREATE INDEX idx_stories_search ON discovery_stories USING gin(to_tsvector('english', headline || ' ' || summary));

-- Enable RLS for discovery_stories
ALTER TABLE discovery_stories ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth required)
CREATE POLICY "Stories are viewable by everyone"
  ON discovery_stories FOR SELECT
  USING (is_active = TRUE);

-- Create user_story_interactions table
CREATE TABLE user_story_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES discovery_stories(id) ON DELETE CASCADE,
  
  -- Interaction Timestamps
  viewed_at TIMESTAMPTZ,
  saved_at TIMESTAMPTZ,
  unsaved_at TIMESTAMPTZ,
  shared_at TIMESTAMPTZ,
  clicked_source_at TIMESTAMPTZ,
  
  -- Engagement Metrics
  read_duration_seconds INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, story_id)
);

-- Indexes for user_story_interactions
CREATE INDEX idx_user_interactions_user ON user_story_interactions(user_id);
CREATE INDEX idx_user_interactions_story ON user_story_interactions(story_id);
CREATE INDEX idx_user_interactions_saved ON user_story_interactions(user_id, saved_at) WHERE saved_at IS NOT NULL;

-- Enable RLS for user_story_interactions
ALTER TABLE user_story_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions"
  ON user_story_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own interactions"
  ON user_story_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions"
  ON user_story_interactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create story_scraping_sources table
CREATE TABLE story_scraping_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'website', 'api')),
  url TEXT NOT NULL UNIQUE,
  
  category TEXT NOT NULL CHECK (category IN ('exams', 'jobs', 'schemes', 'policies', 'all')),
  region TEXT DEFAULT 'National',
  
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 5,
  
  -- Scraping Schedule (3 times daily)
  last_scraped_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  
  -- Performance Metrics
  total_scrapes INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_articles_per_scrape DECIMAL,
  last_error TEXT,
  
  -- Configuration
  scrape_config JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for story_scraping_sources
CREATE INDEX idx_sources_active ON story_scraping_sources(is_active, priority DESC) WHERE is_active = TRUE;
CREATE INDEX idx_sources_category ON story_scraping_sources(category);

-- Enable RLS for story_scraping_sources
ALTER TABLE story_scraping_sources ENABLE ROW LEVEL SECURITY;

-- Public read access for transparency
CREATE POLICY "Sources are viewable by everyone"
  ON story_scraping_sources FOR SELECT
  USING (is_active = TRUE);

-- Create triggers using existing handle_updated_at function
CREATE TRIGGER update_discovery_stories_updated_at 
  BEFORE UPDATE ON discovery_stories
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_user_story_interactions_updated_at
  BEFORE UPDATE ON user_story_interactions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_story_scraping_sources_updated_at
  BEFORE UPDATE ON story_scraping_sources
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Seed Initial Sources (15 trusted Indian sources)
INSERT INTO story_scraping_sources (source_name, source_type, url, category, region, priority) VALUES
-- Government Official Sources (Priority 10)
('PIB - Press Information Bureau', 'rss', 'https://pib.gov.in/RssMain.aspx', 'schemes', 'National', 10),
('SSC Official Website', 'website', 'https://ssc.gov.in', 'exams', 'National', 10),
('UPSC Official Website', 'website', 'https://upsc.gov.in', 'exams', 'National', 10),
('Ministry of Labour Employment News', 'website', 'https://employmentnews.gov.in', 'jobs', 'National', 10),

-- Exam-focused Sources (Priority 8-9)
('Railway Recruitment Boards', 'website', 'https://rrbonlinereg.co.in', 'exams', 'National', 9),
('Banking Exams - IBPS', 'website', 'https://ibps.in', 'exams', 'National', 8),
('State PSC Portals', 'website', 'https://opsc.gov.in', 'exams', 'National', 8),

-- Job-focused Sources (Priority 7-8)
('National Career Service Portal', 'website', 'https://ncs.gov.in', 'jobs', 'National', 8),
('Rozgar Samachar', 'website', 'https://rozgarsamachar.gov.in', 'jobs', 'National', 7),

-- Scheme-focused Sources (Priority 9)
('MyScheme Government Portal', 'website', 'https://www.myscheme.gov.in', 'schemes', 'National', 9),
('PM Schemes Portal', 'website', 'https://pmschemes.in', 'schemes', 'National', 8),

-- News Aggregators (Priority 6-7)
('The Hindu - Government Jobs', 'rss', 'https://www.thehindu.com/news/national/feeder/default.rss', 'all', 'National', 6),
('Times of India - Government', 'rss', 'https://timesofindia.indiatimes.com/rssfeeds/1221656.cms', 'all', 'National', 6),
('Indian Express - Jobs', 'website', 'https://indianexpress.com/section/jobs/', 'jobs', 'National', 6),
('Jagran Josh - Sarkari Naukri', 'website', 'https://www.jagranjosh.com/sarkari-naukri', 'jobs', 'National', 7);