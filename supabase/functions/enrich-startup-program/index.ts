import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callClaude, logClaudeUsage } from "../_shared/claude-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { program_id, program_data, force_refresh = false } = await req.json();
    
    let program: any;
    let isUnsaved = false;

    if (program_id) {
      // Saved program - fetch from database
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: programData, error: fetchError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', program_id)
        .single();

      if (fetchError || !programData) {
        return new Response(
          JSON.stringify({ error: 'Program not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      program = programData;

      // CRITICAL: Only enrich startup programs
      if (program.category?.toLowerCase() !== 'startups') {
        console.log(`Rejecting enrichment for non-startup program: ${program.category}`);
        return new Response(
          JSON.stringify({ error: 'This function only enriches startup programs' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if enrichment exists and is fresh (less than 30 days old)
      if (!force_refresh && program.ai_enrichment?.enriched_at) {
        const enrichedDate = new Date(program.ai_enrichment.enriched_at);
        const daysSince = (Date.now() - enrichedDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSince < 30) {
          console.log('Returning cached enrichment');
          return new Response(
            JSON.stringify({ enrichment: program.ai_enrichment, cached: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else if (program_data) {
      // Unsaved program - use provided data directly
      program = program_data;
      isUnsaved = true;

      // CRITICAL: Only enrich startup programs
      if (program.category?.toLowerCase() !== 'startups') {
        console.log(`Rejecting enrichment for non-startup program: ${program.category}`);
        return new Response(
          JSON.stringify({ error: 'Only startup programs can be enriched' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Generating enrichment for unsaved program:', program.title);
    } else {
      return new Response(
        JSON.stringify({ error: 'Either program_id or program_data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new enrichment using Claude AI
    console.log('Calling Claude AI for enrichment...');
    
    const aiResponse = await callClaude({
      systemPrompt: 'You are an expert startup funding advisor for India. Return only valid JSON.',
      userPrompt: enrichmentPrompt,
      enableWebSearch: true,
      maxWebSearchUses: 5,
      temperature: 0.3,
    });

    logClaudeUsage('enrich-startup-program', aiResponse.tokensUsed, aiResponse.webSearchUsed || false);
    console.log('AI response received');

    // Parse the response content as JSON
    const enrichedData = JSON.parse(aiResponse.content);
    
    // Build complete enrichment object
    const enrichment = {
      summary_bar: {
        eligibility_short: program.stage || 'All stages',
        duration: 'Ongoing',
        funding_range: program.funding_amount || 'Check website',
        deadline_status: program.important_dates?.application_end || 'Rolling'
      },
      founder_insights: enrichedData.founder_insights,
      preparation_checklist: enrichedData.preparation_checklist,
      success_metrics: enrichedData.success_metrics,
      apply_assistance: enrichedData.apply_assistance,
      real_example: enrichedData.real_example,
      help_contacts: enrichedData.help_contacts,
      enriched_at: new Date().toISOString(),
      version: '1.0'
    };

    // Save to database only for saved programs
    if (!isUnsaved && program_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('applications')
        .update({ ai_enrichment: enrichment })
        .eq('id', program_id);

      if (updateError) {
        console.error('Error saving enrichment:', updateError);
        throw updateError;
      }

      console.log('Enrichment saved successfully');
    } else {
      console.log('Enrichment generated for unsaved program (not persisted)');
    }

    return new Response(
      JSON.stringify({ enrichment, cached: false, unsaved: isUnsaved }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enrich-startup-program:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
