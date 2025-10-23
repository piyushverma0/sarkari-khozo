import { useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { MobileStoryCard } from './MobileStoryCard';
import { DiscoveryStory } from '@/types/discovery';
import { Loader2 } from 'lucide-react';

interface MobileCardScrollViewProps {
  stories: DiscoveryStory[];
  savedStoryIds: Set<string>;
  onSave: (storyId: string) => void;
  onShare: (story: DiscoveryStory) => void;
  onStoryClick: (story: DiscoveryStory) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export const MobileCardScrollView = ({
  stories,
  savedStoryIds,
  onSave,
  onShare,
  onStoryClick,
  onLoadMore,
  hasMore,
  isLoading,
}: MobileCardScrollViewProps) => {
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  const [activeCardId, setActiveCardId] = useState<string | null>(stories[0]?.id || null);

  useEffect(() => {
    if (inView && hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  if (stories.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <p className="text-muted-foreground text-center">
          No stories found. Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-scroll snap-y snap-mandatory h-[calc(100vh-140px)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stories.map((story, index) => {
        const CardWrapper = ({ children }: { children: React.ReactNode }) => {
          const { ref, inView } = useInView({
            threshold: 0.6,
            onChange: (inView) => {
              if (inView) {
                setActiveCardId(story.id);
              }
            }
          });

          return (
            <div 
              ref={ref}
              className={`snap-start snap-always h-[calc(100vh-220px)] flex-shrink-0 px-4 pt-4 pb-2 transition-opacity duration-300 ${
                activeCardId === story.id ? 'opacity-100' : 'opacity-40'
              }`}
            >
              {children}
            </div>
          );
        };

        return (
          <CardWrapper key={story.id}>
            <MobileStoryCard
              story={story}
              isSaved={savedStoryIds.has(story.id)}
              onSave={onSave}
              onShare={onShare}
              onClick={onStoryClick}
            />
          </CardWrapper>
        );
      })}

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isLoading && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        </div>
      )}
    </div>
  );
};
