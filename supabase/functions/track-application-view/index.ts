import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { application_id } = await req.json();

    if (!application_id) {
      return new Response(
        JSON.stringify({ error: 'application_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tracking view for application ${application_id} by user ${user.id}`);

    // Upsert into application_views table (prevents duplicate counts per user)
    const { error: upsertError } = await supabaseClient
      .from('application_views')
      .upsert(
        {
          user_id: user.id,
          application_id: application_id,
          viewed_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,application_id',
          ignoreDuplicates: false, // Update viewed_at if already exists
        }
      );

    if (upsertError) {
      console.error('Error upserting application view:', upsertError);
      throw upsertError;
    }

    // Get the count of unique viewers
    const { count, error: countError } = await supabaseClient
      .from('application_views')
      .select('*', { count: 'exact', head: true })
      .eq('application_id', application_id);

    if (countError) {
      console.error('Error counting views:', countError);
      throw countError;
    }

    // Update the applications table with the view count
    const { error: updateError } = await supabaseClient
      .from('applications')
      .update({
        view_count: count || 0,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('id', application_id);

    if (updateError) {
      console.error('Error updating application view count:', updateError);
      throw updateError;
    }

    console.log(`Successfully tracked view. Total views: ${count}`);

    return new Response(
      JSON.stringify({ success: true, view_count: count }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in track-application-view:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});