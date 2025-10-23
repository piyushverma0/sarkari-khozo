import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DiscoverFilters } from '@/components/discover/DiscoverFilters';
import { StoryGridView } from '@/components/discover/StoryGridView';
import { MobileReelsView } from '@/components/discover/MobileReelsView';
import { StoryCard } from '@/components/discover/StoryCard';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, ArrowLeft, Smartphone, Grid3x3 } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'reels'>('grid');
  const [currentReelsIndex, setCurrentReelsIndex] = useState(0);
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

  // Handle view tracking
  const handleView = async (storyId: string) => {
    if (!user) return;

    await supabase.functions.invoke('track-story-interaction', {
      body: {
        story_id: storyId,
        interaction_type: 'view'
      }
    });
  };

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
      {/* Header - Hide in mobile reels mode */}
      {!(isMobile && viewMode === 'reels') && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Home
                </Button>
                <div className="h-6 w-px bg-border" />
                <h1 className="text-2xl font-bold">Discover</h1>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle - Mobile only */}
                {isMobile && stories.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'reels' : 'grid')}
                  >
                    {viewMode === 'grid' ? (
                      <>
                        <Smartphone className="w-4 h-4 mr-2" />
                        Reels
                      </>
                    ) : (
                      <>
                        <Grid3x3 className="w-4 h-4 mr-2" />
                        Grid
                      </>
                    )}
                  </Button>
                )}

                {/* Saved Stories Sheet */}
                {user && (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchSavedStories}
                      >
                        <Bookmark className="w-4 h-4 mr-2" />
                        Saved ({savedStoryIds.size})
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Saved Stories</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6 space-y-4">
                        {savedStories.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            No saved stories yet
                          </p>
                        ) : (
                          savedStories.map((story) => (
                            <StoryCard
                              key={story.id}
                              story={story}
                              viewMode="compact"
                              onSave={() => handleSave(story.id)}
                              onShare={() => handleShare(story)}
                              isSaved={true}
                            />
                          ))
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isMobile && viewMode === 'reels' && stories.length > 0 ? (
        /* Mobile Reels View - Full Screen */
        <MobileReelsView
          stories={stories}
          currentIndex={currentReelsIndex}
          onIndexChange={setCurrentReelsIndex}
          onSave={handleSave}
          onShare={handleShare}
          onView={handleView}
          savedStoryIds={savedStoryIds}
          onLoadMore={() => fetchStories(false)}
          hasMore={pagination.hasMore}
        />
      ) : (
        /* Grid View - Two Column Layout */
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Main Content - Articles on Left */}
            <div className="flex-1 min-w-0">
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
                    <Button
                      onClick={handleSeedStories}
                      disabled={isSeeding}
                      variant="default"
                    >
                      {isSeeding ? (
                        <>
                          <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                          Loading Sample Stories...
                        </>
                      ) : (
                        'Load Sample Stories'
                      )}
                    </Button>
                    <Button
                      onClick={handleScrapeNews}
                      disabled={isScraping}
                      variant="outline"
                    >
                      {isScraping ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                          Fetching News...
                        </>
                      ) : (
                        'Fetch Fresh News'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <StoryGridView
                  stories={stories}
                  onSave={handleSave}
                  onShare={handleShare}
                  onStoryClick={(story) => {
                    handleView(story.id);
                    window.open(story.source_url, '_blank');
                  }}
                  savedStoryIds={savedStoryIds}
                  onLoadMore={() => fetchStories(false)}
                  hasMore={pagination.hasMore}
                  isLoading={isLoading}
                />
              )}
            </div>

            {/* Filters Sidebar - Right */}
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky top-24">
                <DiscoverFilters
                  filters={filters}
                  onFilterChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
                  userState={userState}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
