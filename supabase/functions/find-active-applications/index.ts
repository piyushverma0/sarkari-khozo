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

    const prompt = `CRITICAL: You MUST use web search to find current information. Do NOT rely on training data.

Today's Date: ${new Date().toISOString().split('T')[0]}

Organization: "${organizationName}"
Official URL: ${organizationUrl || 'Search for official website'}

MANDATORY WEB SEARCH TASKS:
1. Search "${organizationName} recruitment 2025 applications" on the web
2. Visit the official website: ${organizationUrl || 'search for it'}
3. Check Sarkari Result: site:sarkariresult.com ${organizationName}
4. Check Employment News: site:employmentnews.gov.in ${organizationName}

Find ALL recent applications from this organization including:
- Currently OPEN (accepting applications RIGHT NOW)
- Upcoming (announced but not yet started)
- Recently CLOSED (deadline passed within last 3 months)
- Closing Soon (deadline within 7 days)

PRIORITIZE active/upcoming applications, but ALSO include recently closed ones to give users complete picture.

For EACH application found via web search, extract:
- Exact official title with year (e.g., "SSC CGL 2025", "UPSC CSE 2025")
- Direct official application URL
- Brief description (max 100 chars - post names/eligibility)
- Application deadline in YYYY-MM-DD format (or "TBA")
- Total vacancies as number (or "TBA")
- Status: "active" (open now), "closing_soon" (deadline ≤7 days), "upcoming" (not started), "closed" (deadline passed)

STRICT OUTPUT FORMAT - Return ONLY this JSON array, nothing else:
[
  {
    "title": "SSC CGL 2025",
    "url": "https://ssc.gov.in/...",
    "description": "Combined Graduate Level Examination - Various Group B & C posts",
    "application_deadline": "2025-11-15",
    "vacancies": "17727",
    "status": "active"
  }
]

Return 5-15 applications (prioritize active/upcoming, then recently closed). If NONE found after web search, return [].

REMEMBER: Use web search! Today is ${new Date().toISOString().split('T')[0]}.`;

    const response = await callClaude({
      systemPrompt: 'You are an expert on Indian government recruitment. Return ONLY valid JSON array.',
      userPrompt: prompt,
      enableWebSearch: true,
      forceWebSearch: true, // Force web search to get current data
      maxWebSearchUses: 15,
      temperature: 0.3,
    });

    logClaudeUsage('find-active-applications', response.tokensUsed, response.webSearchUsed || false);
    console.log('AI response:', JSON.stringify(response));
    console.log('Web search used:', response.webSearchUsed);
    
    // Verify web search was actually used
    if (!response.webSearchUsed) {
      console.error('WARNING: Web search was not used despite forceWebSearch=true');
    }

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
