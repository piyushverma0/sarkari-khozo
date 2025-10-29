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
  const [featuredStory, setFeaturedStory] = useState<DiscoveryStory | null>(null);

  // Smart rotation: Show different featured story on each visit (Instagram Reels style)
  useEffect(() => {
    if (stories.length === 0) return;

    // Get rotation history from sessionStorage
    const STORAGE_KEY = 'featured_story_rotation';
    const MAX_HISTORY = 5;
    
    const getRotationHistory = (): number[] => {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    };

    const saveRotationHistory = (history: number[]) => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
      } catch {
        // Ignore storage errors
      }
    };

    // Get top candidates: Most recent and relevant stories
    const candidates = stories
      .map((story, index) => ({
        story,
        originalIndex: index,
        score: story.relevance_score + (story.is_featured ? 5 : 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(15, stories.length)); // Top 15 or all if fewer

    // Get rotation history and filter out recently shown
    const history = getRotationHistory();
    const availableCandidates = candidates.filter(
      c => !history.includes(c.originalIndex)
    );

    // If all candidates were shown, reset history
    const finalCandidates = availableCandidates.length > 0 
      ? availableCandidates 
      : candidates;

    // Pick a random story from candidates
    const selectedCandidate = finalCandidates[
      Math.floor(Math.random() * finalCandidates.length)
    ];

    // Update featured story and rotation history
    setFeaturedStory(selectedCandidate.story);
    saveRotationHistory([...history, selectedCandidate.originalIndex]);
  }, [stories]);

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
