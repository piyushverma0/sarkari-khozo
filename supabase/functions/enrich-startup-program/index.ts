import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
      console.log('Generating enrichment for unsaved program:', program.title);
    } else {
      return new Response(
        JSON.stringify({ error: 'Either program_id or program_data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new enrichment using Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const enrichmentPrompt = `You are an expert on Indian startup funding programs and policies.

Program Details:
- Title: ${program.title}
- Description: ${program.description || 'Not specified'}
- State: ${program.state_specific || 'All India'}
- Stage: ${program.stage || 'Any'}
- Sector: ${program.sector || 'Any'}
- Funding: ${program.funding_amount || 'Not specified'}
- DPIIT Required: ${program.dpiit_required ? 'Yes' : 'No'}
- Program Type: ${program.program_type || 'General'}

Generate realistic, actionable enrichment data for this startup program. Focus on practical insights that would help founders prepare their application.

Return structured data with:

1. FOUNDER INSIGHTS (3 short tips, each 1 line):
   - Based on typical application patterns for this type of program
   - Include realistic approval timeline estimates
   - Mention practical preparation advice

2. PREPARATION CHECKLIST (5 items for each stage):
   - Customize by startup stage (idea_stage, prototype_stage, revenue_stage)
   - Focus on documents and specific requirements
   - Be specific to the program type and requirements

3. SUCCESS METRICS:
   - Estimate realistic approval rate (e.g., "35-45%" for competitive programs)
   - Typical approval timeline (e.g., "2-3 months")
   - If real data exists for this program, use it; otherwise mark as "estimated"
   - Confidence level: high/medium/low based on data availability

4. APPLICATION STEPS (3-5 clear steps):
   - Include specific portal/website registration details
   - Document submission process
   - Review and follow-up timeline

5. REAL EXAMPLE:
   - Create a realistic startup example that could have received this funding
   - Include plausible name, location (in relevant state), sector, funding year
   - Mark as "simulated" since it's not based on verified real data
   - Make it inspiring but realistic

6. HELP CONTACTS:
   - List 2-3 known incubators for this state/program type
   - Indicate if mentorship is typically available
   - Generic contact information if specific contacts unavailable

Be realistic and practical. Avoid overly optimistic language.`;

    console.log('Calling Lovable AI for enrichment...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert startup funding advisor for India. Return only valid JSON.' },
          { role: 'user', content: enrichmentPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "enrich_program_data",
            description: "Return structured enrichment data for startup program",
            parameters: {
              type: "object",
              properties: {
                founder_insights: {
                  type: "array",
                  items: { type: "string" },
                  description: "3 practical tips for founders (1 line each)"
                },
                preparation_checklist: {
                  type: "object",
                  properties: {
                    idea_stage: { type: "array", items: { type: "string" } },
                    prototype_stage: { type: "array", items: { type: "string" } },
                    revenue_stage: { type: "array", items: { type: "string" } }
                  },
                  required: ["idea_stage", "prototype_stage", "revenue_stage"]
                },
                success_metrics: {
                  type: "object",
                  properties: {
                    approval_rate: { type: "string" },
                    avg_approval_time: { type: "string" },
                    total_funded: { type: "number" },
                    confidence_level: { type: "string", enum: ["high", "medium", "low"] },
                    data_source: { type: "string" }
                  },
                  required: ["approval_rate", "avg_approval_time", "confidence_level", "data_source"]
                },
                apply_assistance: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-5 clear application steps"
                },
                real_example: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    location: { type: "string" },
                    sector: { type: "string" },
                    funding_received: { type: "string" },
                    year: { type: "string" },
                    outcome: { type: "string" },
                    is_simulated: { type: "boolean" }
                  },
                  required: ["name", "location", "sector", "funding_received", "year", "outcome", "is_simulated"]
                },
                help_contacts: {
                  type: "object",
                  properties: {
                    incubators: { type: "array", items: { type: "string" } },
                    mentors_available: { type: "boolean" },
                    state_nodal_officer: { type: "string" }
                  }
                }
              },
              required: ["founder_insights", "preparation_checklist", "success_metrics", "apply_assistance", "real_example", "help_contacts"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "enrich_program_data" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const enrichedData = JSON.parse(toolCall.function.arguments);
    
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
