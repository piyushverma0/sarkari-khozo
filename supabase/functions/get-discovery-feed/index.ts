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
    const url = new URL(req.url);
    const category = url.searchParams.get('category') || 'all';
    const region = url.searchParams.get('region');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sort = url.searchParams.get('sort') || 'relevance';

    console.log('Fetching feed:', { category, region, limit, offset, sort });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Build query
    let query = supabase
      .from('discovery_stories')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Apply category filter
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    // Apply region filter
    if (region && region !== 'National') {
      query = query.or(`region.eq.${region},region.eq.National,states.cs.{${region}}`);
    }

    // Apply sorting
    if (sort === 'relevance') {
      query = query.order('relevance_score', { ascending: false })
                   .order('published_date', { ascending: false });
    } else if (sort === 'recent') {
      query = query.order('published_date', { ascending: false });
    } else if (sort === 'trending') {
      // Calculate trending score: views + saves*3 + shares*5
      query = query.order('view_count', { ascending: false })
                   .order('save_count', { ascending: false })
                   .order('published_date', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: stories, error, count } = await query;

    if (error) throw error;

    const hasMore = count ? (offset + limit) < count : false;

    return new Response(
      JSON.stringify({ 
        success: true,
        stories: stories || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching feed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
