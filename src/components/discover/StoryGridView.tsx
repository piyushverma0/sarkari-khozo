import { StoryCard } from './StoryCard';
import { DiscoveryStory } from '@/types/discovery';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StoryGridViewProps {
  stories: DiscoveryStory[];
  onSave: (storyId: string) => void;
  onShare: (story: DiscoveryStory) => void;
  onStoryClick: (story: DiscoveryStory) => void;
  savedStoryIds: Set<string>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export const StoryGridView = ({
  stories,
  onSave,
  onShare,
  onStoryClick,
  savedStoryIds,
  onLoadMore,
  hasMore,
  isLoading
}: StoryGridViewProps) => {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '400px'
  });

  // Track the latest story to feature
  const [featuredStory, setFeaturedStory] = useState<DiscoveryStory | null>(
    stories.length > 0 ? stories[0] : null
  );

  // Update featured story when stories change
  useEffect(() => {
    if (stories.length > 0 && !featuredStory) {
      setFeaturedStory(stories[0]);
    }
  }, [stories, featuredStory]);

  // Listen for new stories in real-time
  useEffect(() => {
    const channel = supabase
      .channel('new-discovery-stories')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discovery_stories'
        },
        (payload) => {
          console.log('New story detected:', payload);
          // Show the newly added story as featured
          if (payload.new) {
            setFeaturedStory(payload.new as DiscoveryStory);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load more when scrolling near bottom
  useEffect(() => {
    if (inView && hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  // Dynamic grid pattern: Every 7-8 cards, one card spans full width
  const getCardSpanClass = (index: number) => {
    // Every 8th card (after 7 regular cards) spans full width
    const position = index % 8;
    if (position === 7) {
      return "sm:col-span-2 lg:col-span-3"; // Full width card
    }
    return ""; // Regular card
  };

  // Get stories for grid (excluding the currently featured one)
  const gridStories = stories.filter((story) => story.id !== featuredStory?.id);

  return (
    <div className="space-y-6">
      {/* Featured Story - Shows latest news automatically */}
      {featuredStory && (
        <div className="max-w-4xl transition-all duration-500">
          <StoryCard
            story={featuredStory}
            viewMode="full"
            onSave={() => onSave(featuredStory.id)}
            onShare={() => onShare(featuredStory)}
            onView={() => onStoryClick(featuredStory)}
            isSaved={savedStoryIds.has(featuredStory.id)}
          />
        </div>
      )}

      {/* Dynamic Grid of Stories */}
      {gridStories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gridStories.map((story, index) => (
            <div key={story.id} className={getCardSpanClass(index)}>
              <StoryCard
                story={story}
                viewMode="compact"
                onSave={() => onSave(story.id)}
                onShare={() => onShare(story)}
                onView={() => onStoryClick(story)}
                isSaved={savedStoryIds.has(story.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={ref} className="py-8 text-center">
          {isLoading && (
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
