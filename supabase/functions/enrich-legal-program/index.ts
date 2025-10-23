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

      // CRITICAL: Only enrich legal programs
      if (program.category?.toLowerCase() !== 'legal') {
        console.log(`Rejecting enrichment for non-legal program: ${program.category}`);
        return new Response(
          JSON.stringify({ error: 'This function only enriches legal programs' }),
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

      // CRITICAL: Only enrich legal programs
      if (program.category?.toLowerCase() !== 'legal') {
        console.log(`Rejecting enrichment for non-legal program: ${program.category}`);
        return new Response(
          JSON.stringify({ error: 'Only legal programs can be enriched' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Generating enrichment for unsaved legal program:', program.title);
    } else {
      return new Response(
        JSON.stringify({ error: 'Either program_id or program_data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new enrichment using Claude AI
    const enrichmentPrompt = `You are an expert on Indian legal education, judiciary exams, fellowships, and legal career opportunities.

Program Details:
- Title: ${program.title}
- Description: ${program.description || 'Not specified'}
- Location: ${program.location || 'Pan-India'}
- Program Type: ${program.program_type || 'General'}
- Duration: ${program.duration || 'Not specified'}
- Funding: ${program.funding_amount || 'Not specified'}
- Eligibility: ${program.eligibility || 'Not specified'}

Return JSON with founder_insights, preparation_checklist (law_student, practicing_lawyer, researcher), success_metrics, apply_assistance, real_example, help_contacts.`;

    console.log('Calling Claude AI for legal program enrichment...');
    
    const aiResponse = await callClaude({
      systemPrompt: 'You are an expert legal career advisor for India. Return only valid JSON.',
      userPrompt: enrichmentPrompt,
      enableWebSearch: true,
      maxWebSearchUses: 5,
      temperature: 0.3,
    });

    logClaudeUsage('enrich-legal-program', aiResponse.tokensUsed, aiResponse.webSearchUsed || false);
    
    // Sanitize Claude response - remove markdown code fences if present
    let cleanContent = aiResponse.content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const enrichedData = JSON.parse(cleanContent);
    
    // Build complete enrichment object
    const enrichment = {
      summary_bar: {
        eligibility_short: program.eligibility || 'Check requirements',
        duration: program.duration || 'Varies',
        funding_range: program.funding_amount || 'Check website',
        deadline_status: program.important_dates?.application_deadline || 'Check website'
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

      console.log('Legal program enrichment saved successfully');
    } else {
      console.log('Enrichment generated for unsaved legal program (not persisted)');
    }

    return new Response(
      JSON.stringify({ enrichment, cached: false, unsaved: isUnsaved }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enrich-legal-program:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
