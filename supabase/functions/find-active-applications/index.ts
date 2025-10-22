import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { organizationName, organizationUrl } = await req.json();
    
    if (!organizationName) {
      return new Response(
        JSON.stringify({ error: 'Organization name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Finding active applications for:', organizationName);

    const prompt = `You are an expert on Indian government recruitment boards and examination authorities.

Organization: "${organizationName}"
Official URL: ${organizationUrl || 'Not provided'}

Task: Find ALL currently active recruitment notifications and exams from this organization.

Search these sources:
- Official website (${organizationUrl || 'search for it'})
- Sarkari Result (sarkariresult.com)
- Employment News (employmentnews.gov.in)
- Official notification PDFs

Return ONLY:
1. Applications with OPEN application windows (deadline not passed)
2. Applications marked as "upcoming" with announced dates
3. Exclude expired/closed applications

For each active application, extract:
- Exact official title (include year like "2025" or "2024")
- Direct application URL (official link)
- Brief description (post names, eligibility in one line - max 100 chars)
- Application deadline (format: YYYY-MM-DD, or "TBA" if not announced)
- Total vacancies (number only, or "TBA" if not announced)
- Status: "active" (open now), "closing_soon" (deadline within 7 days), "upcoming" (not open yet)

IMPORTANT: Return ONLY a valid JSON array, nothing else. Use this exact structure:
[
  {
    "title": "RRB NTPC 2025",
    "url": "https://rrbcdg.gov.in/...",
    "description": "Non-Technical Popular Categories - Graduate level posts",
    "application_deadline": "2025-12-15",
    "vacancies": "35208",
    "status": "active"
  }
]

Return 3-10 currently active/upcoming applications. If none found, return empty array [].`;

    const response = await callClaude({
      systemPrompt: 'You are an expert on Indian government recruitment. Return ONLY valid JSON array.',
      userPrompt: prompt,
      enableWebSearch: true,
      maxWebSearchUses: 15,
      temperature: 0.3,
    });

    logClaudeUsage('find-active-applications', response.tokensUsed, response.webSearchUsed || false);
    console.log('AI response:', JSON.stringify(response));

    let applications;
    try {
      const content = response.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        applications = JSON.parse(jsonMatch[0]);
      } else {
        // If no array found, return empty array
        applications = [];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return empty array instead of error
      applications = [];
    }

    return new Response(
      JSON.stringify({ 
        organization_name: organizationName,
        active_applications: applications 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-active-applications:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
