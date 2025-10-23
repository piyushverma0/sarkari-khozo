import { useState, useEffect, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import { ReelsStoryCard } from './ReelsStoryCard';
import { DiscoveryStory } from '@/types/discovery';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface MobileReelsViewProps {
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

export const MobileReelsView = ({
  stories,
  currentIndex,
  onIndexChange,
  onSave,
  onShare,
  onView,
  savedStoryIds,
  onLoadMore,
  hasMore
}: MobileReelsViewProps) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);

  // Track view when story changes
  useEffect(() => {
    if (stories[currentIndex]) {
      onView(stories[currentIndex].id);
    }
  }, [currentIndex, stories, onView]);

  // Prefetch next stories when approaching end
  useEffect(() => {
    if (hasMore && currentIndex >= stories.length - 3 && onLoadMore && !isTransitioning) {
      onLoadMore();
    }
  }, [currentIndex, stories.length, hasMore, onLoadMore, isTransitioning]);

  const handleSwipe = useCallback((direction: 'up' | 'down') => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setSwipeDirection(direction);

    setTimeout(() => {
      if (direction === 'up' && currentIndex < stories.length - 1) {
        onIndexChange(currentIndex + 1);
      } else if (direction === 'down' && currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      }
      
      setTimeout(() => {
        setIsTransitioning(false);
        setSwipeDirection(null);
      }, 100);
    }, 180);
  }, [currentIndex, stories.length, onIndexChange, isTransitioning]);

  const handlers = useSwipeable({
    onSwipedUp: () => handleSwipe('up'),
    onSwipedDown: () => handleSwipe('down'),
    preventScrollOnSwipe: true,
    trackMouse: false,
    delta: 50,
    swipeDuration: 500,
  });

  if (!stories[currentIndex]) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <p className="text-muted-foreground">No stories available</p>
      </div>
    );
  }

  return (
    <div {...handlers} className="relative h-screen w-full overflow-hidden bg-background">
      {/* Current Story */}
      <div 
        className={`absolute inset-0 transition-all duration-200 ${
          swipeDirection === 'up' 
            ? 'animate-fade-out translate-y-[-10px]' 
            : swipeDirection === 'down'
            ? 'animate-fade-out translate-y-[10px]'
            : 'animate-fade-in'
        }`}
      >
        <ReelsStoryCard
          story={stories[currentIndex]}
          onSave={() => onSave(stories[currentIndex].id)}
          onShare={() => onShare(stories[currentIndex])}
          isSaved={savedStoryIds.has(stories[currentIndex].id)}
        />
      </div>

      {/* Swipe Hints */}
      <div className="absolute inset-x-0 bottom-32 flex flex-col items-center gap-3 pointer-events-none z-10">
        {currentIndex < stories.length - 1 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full animate-fade-in">
            <ChevronUp className="w-4 h-4 animate-bounce" />
            <span>Swipe up for next</span>
          </div>
        )}
        {currentIndex > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full animate-fade-in">
            <ChevronDown className="w-4 h-4 animate-bounce" />
            <span>Swipe down for previous</span>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full z-10 animate-fade-in">
        <span className="text-sm font-medium">{currentIndex + 1}</span>
        <span className="text-sm text-muted-foreground">/ {stories.length}</span>
      </div>

      {/* Loading Indicator */}
      {hasMore && currentIndex >= stories.length - 3 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full animate-pulse">
          Loading more stories...
        </div>
      )}
    </div>
  );
};
