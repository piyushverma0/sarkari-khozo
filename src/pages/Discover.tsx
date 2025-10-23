import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DiscoverFilters } from '@/components/discover/DiscoverFilters';
import { SwipeableStoryView } from '@/components/discover/SwipeableStoryView';
import { StoryGridView } from '@/components/discover/StoryGridView';
import { StoryCard } from '@/components/discover/StoryCard';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, Monitor, Smartphone } from 'lucide-react';
import { DiscoveryStory, FeedFilters } from '@/types/discovery';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [stories, setStories] = useState<DiscoveryStory[]>([]);
  const [savedStories, setSavedStories] = useState<DiscoveryStory[]>([]);
  const [savedStoryIds, setSavedStoryIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
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

  const [viewMode, setViewMode] = useState<'swipe' | 'grid'>(
    isMobile ? 'swipe' : 'grid'
  );

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
          setCurrentIndex(0);
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

  // Fetch saved stories
  const fetchSavedStories = async () => {
    if (!user) return;

    const { data, error } = await supabase.functions.invoke('get-saved-stories');
    
    if (!error && data.success) {
      setSavedStories(data.stories);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pt-16">
      {/* Header */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Discover</h1>
              <p className="text-sm text-muted-foreground">
                Latest updates on schemes, exams, and jobs
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'swipe' ? 'grid' : 'swipe')}
              >
                {viewMode === 'swipe' ? (
                  <><Monitor className="w-4 h-4 mr-2" /> Grid</>
                ) : (
                  <><Smartphone className="w-4 h-4 mr-2" /> Swipe</>
                )}
              </Button>

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

          {/* Filters */}
          <DiscoverFilters
            filters={filters}
            onFilterChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
            userState={userState}
          />
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {isLoading && stories.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              No stories found. Try adjusting your filters.
            </p>
          </div>
        ) : viewMode === 'swipe' ? (
          <SwipeableStoryView
            stories={stories}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            onSave={handleSave}
            onShare={handleShare}
            onView={handleView}
            savedStoryIds={savedStoryIds}
            onLoadMore={() => fetchStories(false)}
            hasMore={pagination.hasMore}
          />
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
    </div>
  );
}
