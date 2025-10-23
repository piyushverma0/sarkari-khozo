import { useState, useEffect, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import { StoryCard } from './StoryCard';
import { DiscoveryStory } from '@/types/discovery';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SwipeableStoryViewProps {
  stories: DiscoveryStory[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onSave: (storyId: string) => void;
  onShare: (story: DiscoveryStory) => void;
  onView: (storyId: string) => void;
  savedStoryIds: Set<string>;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const SwipeableStoryView = ({
  stories,
  currentIndex,
  onIndexChange,
  onSave,
  onShare,
  onView,
  savedStoryIds,
  onLoadMore,
  hasMore
}: SwipeableStoryViewProps) => {
  const [viewStartTime, setViewStartTime] = useState<number>(Date.now());

  // Track view duration when story changes
  useEffect(() => {
    if (stories[currentIndex]) {
      setViewStartTime(Date.now());
      onView(stories[currentIndex].id);
    }
  }, [currentIndex, stories, onView]);

  // Load more when approaching end
  useEffect(() => {
    if (hasMore && currentIndex >= stories.length - 3 && onLoadMore) {
      onLoadMore();
    }
  }, [currentIndex, stories.length, hasMore, onLoadMore]);

  const handleSwipe = useCallback((direction: 'up' | 'down') => {
    if (direction === 'up' && currentIndex < stories.length - 1) {
      onIndexChange(currentIndex + 1);
    } else if (direction === 'down' && currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  }, [currentIndex, stories.length, onIndexChange]);

  const handlers = useSwipeable({
    onSwipedUp: () => handleSwipe('up'),
    onSwipedDown: () => handleSwipe('down'),
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  if (!stories[currentIndex]) {
    return null;
  }

  return (
    <div {...handlers} className="relative h-[calc(100vh-8rem)] overflow-hidden">
      {/* Current Story */}
      <div className="h-full animate-fade-in">
        <StoryCard
          story={stories[currentIndex]}
          viewMode="full"
          onSave={() => onSave(stories[currentIndex].id)}
          onShare={() => onShare(stories[currentIndex])}
          isSaved={savedStoryIds.has(stories[currentIndex].id)}
        />
      </div>

      {/* Navigation Hints */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
        {currentIndex > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full animate-fade-in">
            <ChevronDown className="w-3 h-3" />
            <span>Swipe down for previous</span>
          </div>
        )}
        {currentIndex < stories.length - 1 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full animate-fade-in">
            <ChevronUp className="w-3 h-3" />
            <span>Swipe up for next</span>
          </div>
        )}
      </div>

      {/* Story Progress Indicator */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full animate-scale-in">
        <span className="text-xs font-medium">{currentIndex + 1}</span>
        <span className="text-xs text-muted-foreground">/ {stories.length}</span>
      </div>
    </div>
  );
};
