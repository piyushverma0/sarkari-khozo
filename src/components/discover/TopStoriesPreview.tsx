import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StoryCard } from './StoryCard';
import { DiscoveryStory } from '@/types/discovery';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

export const TopStoriesPreview = () => {
  const [stories, setStories] = useState<DiscoveryStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTopStories = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-discovery-feed', {
          body: {
            category: 'all',
            sort: 'trending',
            limit: 4,
            offset: 0
          }
        });

        if (error) throw error;

        if (data.success) {
          setStories(data.stories);
        }
      } catch (error) {
        console.error('Error fetching top stories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopStories();
  }, []);

  const handleShare = async (story: DiscoveryStory) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: story.headline,
          text: story.summary,
          url: story.source_url
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(story.source_url);
      toast({ title: 'Link copied to clipboard!' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (stories.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4">
        {stories.map((story) => (
          <div key={story.id} className="w-[320px] flex-shrink-0">
            <StoryCard
              story={story}
              viewMode="compact"
              onShare={() => handleShare(story)}
              onView={() => window.open(story.source_url, '_blank')}
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
