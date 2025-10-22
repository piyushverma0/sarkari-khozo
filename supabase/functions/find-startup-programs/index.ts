import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callClaude, logClaudeUsage } from "../_shared/claude-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache (24 hour TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stage, sector, state, dpiit_required, program_type } = await req.json();
    
    console.log('Find startup programs request:', { stage, sector, state, dpiit_required, program_type });

    // Create cache key from parameters
    const cacheKey = JSON.stringify({ stage, sector, state, dpiit_required, program_type });
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('Returning cached result');
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Calling Claude AI with web search...');

    const prompt = `You are a startup policy expert in India. Find 3-6 current government and state-level startup programs.

Search criteria:
- Stage: ${stage || 'Any'}
- Sector: ${sector || 'Any'}
- State: ${state || 'Any'}
- DPIIT Required: ${dpiit_required || 'Any'}
- Program Type: ${program_type || 'Any'}

Focus on:
- Startup India schemes (DPIIT)
- State Startup Missions
- SIDBI-backed programs
- NIDHI programs (DST)
- Ministry schemes (MeitY, BIRAC, etc.)

Return ONLY valid JSON with this structure (no markdown, no backticks, just the JSON array):
[
  {
    "title": "Program name",
    "url": "Official URL",
    "description": "Brief description",
    "program_type": "grant|seed_funding|incubation|policy_benefit",
    "funding_amount": "₹X-Y lakh or ₹X lakh",
    "eligible_stages": ["Idea", "Prototype", "Revenue"],
    "eligible_sectors": ["Tech", "AgriTech"] or "All Sectors",
    "state_specific": "Karnataka" or "All India",
    "dpiit_required": true/false,
    "success_rate": "High|Medium|Low",
    "deadline": "YYYY-MM-DD or Rolling"
  }
]`;

    const response = await callClaude({
      systemPrompt: 'You are a startup policy expert in India. Return ONLY valid JSON.',
      userPrompt: prompt,
      enableWebSearch: true,
      maxWebSearchUses: 10,
      temperature: 0.7,
    });

    logClaudeUsage('find-startup-programs', response.tokensUsed, response.webSearchUsed || false);
    console.log('AI response received');
    
    const content = response.content;
    
    // Parse the JSON response
    let programs;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const rawPrograms = JSON.parse(cleanedContent);
      
      // Transform field names to match frontend expectations
      programs = rawPrograms.map((program: any) => ({
        ...program,
        // Convert eligible_stages array to stage string
        stage: Array.isArray(program.eligible_stages) 
          ? program.eligible_stages.join(', ') 
          : program.eligible_stages,
        // Convert eligible_sectors to sector
        sector: Array.isArray(program.eligible_sectors)
          ? program.eligible_sectors.join(', ')
          : program.eligible_sectors,
        // Add category field
        category: 'Startups',
        // Parse deadline into important_dates format if it exists
        important_dates: program.deadline ? {
          application_end: program.deadline === 'Rolling' ? null : program.deadline
        } : null,
        // Add basic enrichment inline for instant display
        ai_enrichment: {
          summary_bar: {
            eligibility_short: Array.isArray(program.eligible_stages) 
              ? program.eligible_stages.join(' / ') 
              : 'All stages',
            duration: 'Ongoing',
            funding_range: program.funding_amount || 'Check website',
            deadline_status: program.deadline === 'Rolling' ? 'Rolling' : 'Check website'
          },
          enriched_at: new Date().toISOString(),
          version: '1.0-basic'
        },
        // Remove old field names to avoid confusion
        eligible_stages: undefined,
        eligible_sectors: undefined,
        deadline: undefined,
      }));
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Store in cache
    cache.set(cacheKey, { data: programs, timestamp: Date.now() });

    // Clean up old cache entries periodically
    if (cache.size > 100) {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key);
        }
      }
    }

    return new Response(JSON.stringify(programs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in find-startup-programs:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Failed to find startup programs'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
