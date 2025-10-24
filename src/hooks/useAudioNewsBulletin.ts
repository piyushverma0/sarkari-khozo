import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AudioScript {
  id: string;
  story_order: number;
  hindi_script: string;
  story_id: string;
  discovery_stories?: {
    headline: string;
    category: string;
  };
}

export interface AudioBulletin {
  id: string;
  title: string;
  duration_seconds: number;
  audio_url?: string;
  audio_base64?: string;
  story_ids: string[];
  language: string;
  generated_at: string;
  view_count: number;
  audio_news_scripts: AudioScript[];
}

export const useAudioNewsBulletin = () => {
  const [bulletin, setBulletin] = useState<AudioBulletin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestBulletin();

    // Subscribe to realtime updates for new bulletins
    const channel = supabase
      .channel('audio-bulletins')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audio_news_bulletins'
        },
        () => {
          console.log('New bulletin detected, refreshing...');
          fetchLatestBulletin();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLatestBulletin = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("audio_news_bulletins")
        .select(`
          *,
          audio_news_scripts (
            id,
            story_id,
            story_order,
            hindi_script,
            discovery_stories (
              headline,
              category
            )
          )
        `)
        .eq("is_active", true)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        setError("कोई नई बुलेटिन उपलब्ध नहीं है");
      } else {
        setBulletin(data);
      }
    } catch (err) {
      console.error("Error fetching bulletin:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const trackView = async (bulletinId: string) => {
    try {
      const { error } = await supabase
        .from("audio_news_bulletins")
        .update({ view_count: (bulletin?.view_count || 0) + 1 })
        .eq("id", bulletinId);
      
      if (error) throw error;
    } catch (err) {
      console.error("Error tracking view:", err);
    }
  };

  return { bulletin, isLoading, error, trackView, refetch: fetchLatestBulletin };
};
