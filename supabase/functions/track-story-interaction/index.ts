import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { story_id, interaction_type, read_duration_seconds } = await req.json();

    console.log('Tracking interaction:', { user_id: user.id, story_id, interaction_type });

    // Check if user already viewed this story recently (within 24 hours for views)
    if (interaction_type === 'view') {
      const { data: existingInteraction } = await supabase
        .from('user_story_interactions')
        .select('viewed_at')
        .eq('user_id', user.id)
        .eq('story_id', story_id)
        .maybeSingle();

      if (existingInteraction?.viewed_at) {
        const lastViewed = new Date(existingInteraction.viewed_at);
        const hoursSinceView = (Date.now() - lastViewed.getTime()) / (1000 * 60 * 60);
        
        // If viewed within last 24 hours, don't count as new view
        if (hoursSinceView < 24) {
          console.log('User already viewed this story in last 24 hours, skipping view increment');
          return new Response(
            JSON.stringify({ success: true, message: 'View already tracked' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      }
    }

    // Map interaction type to column
    const interactionColumn: Record<string, string> = {
      'view': 'viewed_at',
      'save': 'saved_at',
      'unsave': 'unsaved_at',
      'share': 'shared_at',
      'click_source': 'clicked_source_at'
    };

    const column = interactionColumn[interaction_type];
    if (!column) {
      throw new Error('Invalid interaction type');
    }

    // Upsert interaction record
    const updateData: any = {
      user_id: user.id,
      story_id,
      [column]: new Date().toISOString()
    };

    if (read_duration_seconds) {
      updateData.read_duration_seconds = read_duration_seconds;
    }

    const { error: upsertError } = await supabase
      .from('user_story_interactions')
      .upsert(updateData, {
        onConflict: 'user_id,story_id'
      });

    if (upsertError) throw upsertError;

    // Update story counters with time-based tracking
    if (interaction_type === 'view') {
      const { data: story } = await supabase
        .from('discovery_stories')
        .select('view_count, views_today, views_this_week, first_viewed_at')
        .eq('id', story_id)
        .maybeSingle();

      if (story) {
        await supabase
          .from('discovery_stories')
          .update({
            view_count: (story.view_count || 0) + 1,
            views_today: (story.views_today || 0) + 1,
            views_this_week: (story.views_this_week || 0) + 1,
            views_last_updated: new Date().toISOString(),
            first_viewed_at: story.first_viewed_at || new Date().toISOString()
          })
          .eq('id', story_id);
      }
    } else if (interaction_type === 'save') {
      const { data: story } = await supabase
        .from('discovery_stories')
        .select('save_count')
        .eq('id', story_id)
        .maybeSingle();

      if (story) {
        await supabase
          .from('discovery_stories')
          .update({ save_count: (story.save_count || 0) + 1 })
          .eq('id', story_id);
      }
    } else if (interaction_type === 'share') {
      const { data: story } = await supabase
        .from('discovery_stories')
        .select('share_count')
        .eq('id', story_id)
        .maybeSingle();

      if (story) {
        await supabase
          .from('discovery_stories')
          .update({ share_count: (story.share_count || 0) + 1 })
          .eq('id', story_id);
      }
    } else if (interaction_type === 'click_source') {
      const { data: story } = await supabase
        .from('discovery_stories')
        .select('click_count')
        .eq('id', story_id)
        .maybeSingle();

      if (story) {
        await supabase
          .from('discovery_stories')
          .update({ click_count: (story.click_count || 0) + 1 })
          .eq('id', story_id);
      }
    }

    // Handle unsave (decrement save_count)
    if (interaction_type === 'unsave') {
      const { data: story } = await supabase
        .from('discovery_stories')
        .select('save_count')
        .eq('id', story_id)
        .maybeSingle();

      if (story && story.save_count > 0) {
        await supabase
          .from('discovery_stories')
          .update({ save_count: story.save_count - 1 })
          .eq('id', story_id);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error tracking interaction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: errorMessage === 'Unauthorized' ? 401 : 500
      }
    );
  }
});
