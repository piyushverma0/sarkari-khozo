import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocalCheckRequest {
  programTitle: string;
  category?: string;
  state: string;
  district?: string;
  block?: string;
  userId?: string;
}

interface LocalInitiativeResult {
  title: string;
  scope: 'district' | 'state' | 'national';
  mode: 'online' | 'csc' | 'office';
  deadline?: string;
  applyUrl?: string;
  contactInfo?: { phone?: string; email?: string };
  confidence: 'verified' | 'likely' | 'community';
  source: string;
  lastVerified?: string;
  description?: string;
  howToApply?: string;
  sourceUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { programTitle, category, state, district, block, userId }: LocalCheckRequest = await req.json();

    if (!programTitle || !state) {
      return new Response(
        JSON.stringify({ error: 'programTitle and state are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Searching for local initiatives: ${programTitle} in ${state}, ${district || 'any district'}, ${block || 'any block'}`);

    // Query local_initiatives with hierarchical matching
    let query = supabase
      .from('local_initiatives')
      .select('*')
      .eq('state', state);

    // Add district filter if provided
    if (district) {
      query = query.or(`district.eq.${district},district.is.null`);
    }

    // Add block filter if provided
    if (block) {
      query = query.or(`block.eq.${block},block.is.null`);
    }

    // Search by program title (case-insensitive partial match)
    query = query.ilike('program_title', `%${programTitle}%`);

    const { data: localInitiatives, error: dbError } = await query;

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log(`Found ${localInitiatives?.length || 0} matching local initiatives`);

    let results: LocalInitiativeResult[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let helperText = '';

    // Process database results
    if (localInitiatives && localInitiatives.length > 0) {
      results = localInitiatives.map(initiative => {
        // Determine scope based on available location data
        let scope: 'district' | 'state' | 'national' = 'state';
        if (initiative.block) scope = 'district';
        if (!initiative.district && !initiative.block) scope = 'national';

        return {
          title: initiative.program_title,
          scope,
          mode: initiative.mode || 'online',
          deadline: initiative.deadline,
          applyUrl: initiative.apply_url,
          contactInfo: initiative.contact_info,
          confidence: initiative.confidence_level || 'verified',
          source: new URL(initiative.source_url || supabaseUrl).hostname,
          lastVerified: initiative.last_verified_at,
          description: initiative.description,
          howToApply: `Apply ${initiative.mode === 'online' ? 'online' : initiative.mode === 'csc' ? 'at your nearest CSC' : 'at the government office'}`,
          sourceUrl: initiative.source_url
        };
      });

      confidence = 'high';
      helperText = `Found ${results.length} verified program${results.length > 1 ? 's' : ''} in your ${district ? 'district' : 'state'}`;
    } else {
      // No direct matches - use Lovable AI for predictions
      console.log('No direct matches found, using AI to predict availability');

      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      const aiPrompt = `You are a government schemes expert for India. Analyze if the following program is available in the user's location:

Program: ${programTitle}
Category: ${category || 'General'}
User Location: ${state}${district ? ', ' + district : ''}${block ? ', ' + block : ''}

Based on:
1. Known national schemes and state-wise rollout patterns
2. Program category and typical geographic coverage
3. State government's participation in similar programs

Provide a confidence assessment and actionable guidance. If this program is likely available, suggest how to apply (online, CSC, or government office). Keep your response concise and practical.`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a helpful government schemes expert for India. Provide clear, actionable guidance in simple language.' },
            { role: 'user', content: aiPrompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content || '';

      console.log('AI prediction:', aiContent);

      // Create a likely result based on AI analysis
      results = [{
        title: programTitle,
        scope: district ? 'district' : 'state',
        mode: 'online', // Default to online, AI might suggest otherwise
        confidence: 'likely',
        source: 'AI Analysis based on government data patterns',
        description: aiContent,
        howToApply: 'Check with your nearest CSC or visit the official government portal for your state.',
      }];

      confidence = 'medium';
      helperText = 'Based on AI analysis - please verify with local authorities';
    }

    // Track the query for analytics (if userId provided)
    if (userId) {
      await supabase.from('local_check_queries').insert({
        user_id: userId,
        state,
        district,
        block,
        results_count: results.length,
      });
    }

    return new Response(
      JSON.stringify({
        results,
        confidence,
        helperText,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-local-availability:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
