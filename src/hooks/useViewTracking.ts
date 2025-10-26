import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseViewTrackingProps {
  storyId: string;
  enabled?: boolean;
  timeThreshold?: number; // seconds
}

export const useViewTracking = ({ 
  storyId, 
  enabled = true,
  timeThreshold = 3 
}: UseViewTrackingProps) => {
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [hoverStartTime, setHoverStartTime] = useState<number | null>(null);
  const trackingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if already viewed in this session
  useEffect(() => {
    if (enabled) {
      const viewedInSession = sessionStorage.getItem(`viewed-${storyId}`);
      if (viewedInSession) {
        setHasTrackedView(true);
      }
    }
  }, [storyId, enabled]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (trackingTimerRef.current) {
        clearTimeout(trackingTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (!enabled || hasTrackedView) return;
    
    setHoverStartTime(Date.now());
    
    // Set timer for time threshold
    trackingTimerRef.current = setTimeout(async () => {
      await trackView();
    }, timeThreshold * 1000);
  };

  const handleMouseLeave = () => {
    if (trackingTimerRef.current) {
      clearTimeout(trackingTimerRef.current);
      trackingTimerRef.current = null;
    }
    setHoverStartTime(null);
  };

  const trackView = async () => {
    if (hasTrackedView) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const readDuration = hoverStartTime 
        ? Math.floor((Date.now() - hoverStartTime) / 1000)
        : timeThreshold;

      await supabase.functions.invoke('track-story-interaction', {
        body: {
          story_id: storyId,
          interaction_type: 'view',
          read_duration_seconds: readDuration
        }
      });

      setHasTrackedView(true);
      sessionStorage.setItem(`viewed-${storyId}`, Date.now().toString());
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const trackClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase.functions.invoke('track-story-interaction', {
        body: {
          story_id: storyId,
          interaction_type: 'click_source'
        }
      });

      // Also count as view if not already tracked
      if (!hasTrackedView) {
        await trackView();
      }
    } catch (error) {
      console.error('Failed to track click:', error);
    }
  };

  return {
    handleMouseEnter,
    handleMouseLeave,
    trackView,
    trackClick,
    hasTrackedView
  };
};
