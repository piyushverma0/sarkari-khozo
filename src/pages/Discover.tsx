import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DiscoverFilters } from '@/components/discover/DiscoverFilters';
import { StoryGridView } from '@/components/discover/StoryGridView';
import { MobileCardScrollView } from '@/components/discover/MobileCardScrollView';
import { MobileFilters } from '@/components/discover/MobileFilters';
import { StoryCard } from '@/components/discover/StoryCard';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SheetDescription } from '@/components/ui/sheet';
import { DiscoveryStory, FeedFilters } from '@/types/discovery';
import { useMediaQuery } from '@/hooks/use-mobile';

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [stories, setStories] = useState<DiscoveryStory[]>([]);
  const [savedStories, setSavedStories] = useState<DiscoveryStory[]>([]);
  const [savedStoryIds, setSavedStoryIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isGeneratingBulletin, setIsGeneratingBulletin] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    limit: 20,
    hasMore: true
  });

  const [filters, setFilters] = useState<FeedFilters>({
    category: (searchParams.get('category') as any) || 'all',
    region: searchParams.get('region') || undefined,
    sort: (searchParams.get('sort') as any) || 'relevance'
  });

  const [user, setUser] = useState<any>(null);
  const [userState, setUserState] = useState<string>();

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch user's saved state
        const { data: profile } = await supabase
          .from('profiles')
          .select('saved_state')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.saved_state) {
          setUserState(profile.saved_state);
        }

        // Fetch saved story IDs
        fetchSavedStoryIds(user.id);
      }
    };
    getUser();
  }, []);

  // Fetch saved story IDs
  const fetchSavedStoryIds = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_story_interactions')
      .select('story_id')
      .eq('user_id', userId)
      .not('saved_at', 'is', null)
      .is('unsaved_at', null);

    if (!error && data) {
      setSavedStoryIds(new Set(data.map(d => d.story_id)));
    }
  };

  // Fetch stories
  const fetchStories = useCallback(async (reset = false) => {
    setIsLoading(true);
    
    const offset = reset ? 0 : pagination.offset;
    
    try {
      const { data, error } = await supabase.functions.invoke('get-discovery-feed', {
        body: {
          category: filters.category,
          region: filters.region,
          sort: filters.sort,
          limit: pagination.limit,
          offset
        }
      });

      if (error) throw error;

      if (data.success) {
        if (reset) {
          setStories(data.stories);
        } else {
          setStories(prev => [...prev, ...data.stories]);
        }

        setPagination({
          ...pagination,
          total: data.pagination.total,
          offset: offset + data.stories.length,
          hasMore: data.pagination.hasMore
        });
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load stories. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.limit, toast]);

  // Initial load
  useEffect(() => {
    fetchStories(true);
  }, [filters]);

  // Update URL params when filters change
  useEffect(() => {
    const params: any = {};
    if (filters.category !== 'all') params.category = filters.category;
    if (filters.region) params.region = filters.region;
    if (filters.sort !== 'relevance') params.sort = filters.sort;
    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Handle save/unsave
  const handleSave = async (storyId: string) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to save stories',
        variant: 'destructive'
      });
      return;
    }

    const isSaved = savedStoryIds.has(storyId);

    try {
      const { error } = await supabase.functions.invoke('track-story-interaction', {
        body: {
          story_id: storyId,
          interaction_type: isSaved ? 'unsave' : 'save'
        }
      });

      if (error) throw error;

      // Update local state
      const newSavedIds = new Set(savedStoryIds);
      if (isSaved) {
        newSavedIds.delete(storyId);
        toast({ title: 'Story removed from saved' });
      } else {
        newSavedIds.add(storyId);
        toast({ title: 'Story saved!' });
      }
      setSavedStoryIds(newSavedIds);

    } catch (error) {
      console.error('Error saving story:', error);
      toast({
        title: 'Error',
        description: 'Failed to save story',
        variant: 'destructive'
      });
    }
  };

  // Handle share
  const handleShare = async (story: DiscoveryStory) => {
    if (user) {
      // Track share interaction
      await supabase.functions.invoke('track-story-interaction', {
        body: {
          story_id: story.id,
          interaction_type: 'share'
        }
      });
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: story.headline,
          text: story.summary,
          url: story.source_url
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback: Copy link
      await navigator.clipboard.writeText(story.source_url);
      toast({ title: 'Link copied to clipboard!' });
    }
  };

  // Handle view tracking and open story
  const handleView = async (story: DiscoveryStory) => {
    if (user) {
      await supabase.functions.invoke('track-story-interaction', {
        body: {
          story_id: story.id,
          interaction_type: 'view'
        }
      });
    }
    window.open(story.source_url, '_blank');
  };

  // Load more stories
  const loadMore = () => {
    if (!isLoading && pagination.hasMore) {
      fetchStories(false);
    }
  };

  // Show saved stories state
  const [showSaved, setShowSaved] = useState(false);

  // Handle seed sample stories
  const handleSeedStories = async () => {
    setIsSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-sample-stories');
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: 'Sample Stories Loaded!',
          description: `${data.count} stories have been added to the feed.`
        });
        // Refresh stories
        await fetchStories(true);
      }
    } catch (error) {
      console.error('Error seeding stories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sample stories',
        variant: 'destructive'
      });
    } finally {
      setIsSeeding(false);
    }
  };

  // Handle manual scraping
  const handleScrapeNews = async () => {
    setIsScraping(true);
    toast({
      title: 'Scraping Started',
      description: 'Fetching latest news from sources. This may take a few minutes...'
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('scrape-news-sources');
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: 'Scraping Complete!',
          description: `Found ${data.results.found_articles} articles, processed ${data.results.processed} stories.`
        });
        // Refresh stories
        await fetchStories(true);
      }
    } catch (error) {
      console.error('Error scraping news:', error);
      toast({
        title: 'Error',
        description: 'Failed to scrape news sources',
        variant: 'destructive'
      });
    } finally {
      setIsScraping(false);
    }
  };

  const handleGenerateBulletin = async () => {
    // First, check story count
    const { count } = await supabase
      .from('discovery_stories')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const storyCount = count || 0;
    
    setIsGeneratingBulletin(true);
    toast({
      title: 'Generating Audio Bulletin',
      description: `Creating Hindi news bulletin from ${storyCount} available stories...`
    });

    try {
      const { data, error } = await supabase.functions.invoke('generate-audio-news-bulletin');

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Audio Bulletin Ready! 🎙️',
          description: `${data.stories_count} stories • ${data.duration}s duration. Visit home page to listen.`
        });
      }
    } catch (error) {
      console.error('Error generating bulletin:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate audio bulletin. Make sure there are stories available.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingBulletin(false);
    }
  };

  // Fetch saved stories
  const fetchSavedStories = async () => {
    if (!user) return;

    const { data, error } = await supabase.functions.invoke('get-saved-stories');
    
    if (!error && data.success) {
      setSavedStories(data.stories);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Discover</h1>
          </div>

          <div className="flex items-center gap-2">
            <Sheet open={showSaved} onOpenChange={setShowSaved}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" onClick={fetchSavedStories}>
                  <Bookmark className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Saved Stories</SheetTitle>
                  <SheetDescription>
                    Your bookmarked stories
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
                  {savedStories.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No saved stories yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {savedStories.map((story) => (
                        <StoryCard
                          key={story.id}
                          story={story}
                          viewMode="compact"
                          isSaved={true}
                          onSave={() => handleSave(story.id)}
                          onShare={() => handleShare(story)}
                          onView={() => handleView(story)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Mobile Filters */}
      {isMobile && (
        <MobileFilters filters={filters} onFilterChange={setFilters} />
      )}

      {/* Content */}
      {isMobile ? (
        <MobileCardScrollView
          stories={stories}
          savedStoryIds={savedStoryIds}
          onSave={handleSave}
          onShare={handleShare}
          onStoryClick={handleView}
          onLoadMore={loadMore}
          hasMore={pagination.hasMore}
          isLoading={isLoading}
        />
      ) : (
        <div className="container py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <div className="flex-1">
              {isLoading && stories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-muted-foreground">Loading stories...</p>
                </div>
              ) : stories.length === 0 ? (
                <div className="text-center py-20 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">No Stories Available Yet</h3>
                    <p className="text-muted-foreground">
                      Stories are being loaded for the first time. You can load sample stories or fetch fresh news.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <Button onClick={handleSeedStories} disabled={isSeeding} variant="default">
                      {isSeeding ? (
                        <>
                          <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                          Loading Sample Stories...
                        </>
                      ) : (
                        'Load Sample Stories'
                      )}
                    </Button>
                    <Button onClick={handleScrapeNews} disabled={isScraping} variant="outline">
                      {isScraping ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                          Fetching News...
                        </>
                      ) : (
                        'Fetch Fresh News'
                      )}
                    </Button>
                    <Button onClick={handleGenerateBulletin} disabled={isGeneratingBulletin} variant="outline">
                      {isGeneratingBulletin ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                          Generating Audio...
                        </>
                      ) : (
                        'Generate Audio Bulletin'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <StoryGridView
                  stories={stories}
                  onSave={handleSave}
                  onShare={handleShare}
                  onStoryClick={handleView}
                  savedStoryIds={savedStoryIds}
                  onLoadMore={loadMore}
                  hasMore={pagination.hasMore}
                  isLoading={isLoading}
                />
              )}
            </div>

            {/* Filters Sidebar - Desktop Only */}
            <aside className="lg:w-80">
              <div className="sticky top-24">
                <DiscoverFilters
                  filters={filters}
                  onFilterChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
                />
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
