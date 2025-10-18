import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

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

    console.log('Calling Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    let programs;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      programs = JSON.parse(cleanedContent);
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
