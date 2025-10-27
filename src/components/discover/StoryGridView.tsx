import { StoryCard } from './StoryCard';
import { DiscoveryStory } from '@/types/discovery';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';

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

  // Rotate featured story every 8 seconds
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const maxFeaturedStories = Math.min(5, stories.length); // Rotate through first 5 stories

  useEffect(() => {
    if (stories.length <= 1) return;
    
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % maxFeaturedStories);
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
  }, [stories.length, maxFeaturedStories]);

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
  const featuredStory = stories[featuredIndex];
  const gridStories = stories.filter((_, idx) => idx !== featuredIndex);

  return (
    <div className="space-y-6">
      {/* Featured Story - Rotates periodically */}
      {featuredStory && (
        <div className="max-w-4xl transition-opacity duration-500">
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
