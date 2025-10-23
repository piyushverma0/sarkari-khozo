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

    // Fetch saved story IDs
    const { data: interactions, error: interactionsError } = await supabase
      .from('user_story_interactions')
      .select('story_id, saved_at')
      .eq('user_id', user.id)
      .not('saved_at', 'is', null)
      .is('unsaved_at', null)
      .order('saved_at', { ascending: false });

    if (interactionsError) throw interactionsError;

    if (!interactions || interactions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, stories: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const storyIds = interactions.map(i => i.story_id);

    // Fetch stories
    const { data: stories, error: storiesError } = await supabase
      .from('discovery_stories')
      .select('*')
      .in('id', storyIds)
      .eq('is_active', true);

    if (storiesError) throw storiesError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        stories: stories || [] 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching saved stories:', error);
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
