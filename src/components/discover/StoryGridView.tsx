import { StoryCard } from './StoryCard';
import { DiscoveryStory } from '@/types/discovery';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

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

  return (
    <div className="space-y-6">
      {/* Featured Story */}
      {stories.length > 0 && (
        <div className="max-w-4xl">
          <StoryCard
            story={stories[0]}
            viewMode="full"
            onSave={() => onSave(stories[0].id)}
            onShare={() => onShare(stories[0])}
            onView={() => onStoryClick(stories[0])}
            isSaved={savedStoryIds.has(stories[0].id)}
          />
        </div>
      )}

      {/* Dynamic Grid of Stories */}
      {stories.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stories.slice(1).map((story, index) => (
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
