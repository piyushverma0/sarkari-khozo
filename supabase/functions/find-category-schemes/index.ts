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
    const { category } = await req.json();
    
    if (!category) {
      return new Response(
        JSON.stringify({ error: 'Category is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Finding schemes for category:', category);

    const prompt = `You are an expert on Indian government schemes, applications, exams, and job opportunities.

Category: "${category}"

Task: Return 4-6 of the most important, popular, and currently active official Indian government schemes, exams, jobs, or applications for this category.

Focus on:
- Official government schemes (.gov.in domains preferred)
- Currently active or regularly conducted programs
- High-impact schemes that many people use
- Mix of different types (scholarships, welfare schemes, exams, jobs)

CRITICAL: You must determine the TYPE of each result:
- "organization": Organizations that conduct MULTIPLE exams/schemes (RRB, SSC, UPSC, IBPS, State PSCs, Banking boards, Police recruitment boards)
- "single_application": Single schemes/jobs/exams with ONE application process (specific job notifications, welfare schemes like PMKVY/MGNREGA, single exam cycles)

Examples of ORGANIZATIONS: Railway Recruitment Board (RRB), Staff Selection Commission (SSC), Union Public Service Commission (UPSC), IBPS, State PSCs (UPPSC, BPSC), State Electricity Boards
Examples of SINGLE_APPLICATION: RPF Constable Recruitment 2025, PMKVY Scheme, MGNREGA, PM Kisan, NEET 2025, JEE Main 2025

IMPORTANT: Return ONLY a valid JSON array, nothing else. Use this exact structure:
[
  {
    "title": "Official name of the scheme/exam/job",
    "url": "Official government URL",
    "description": "One sentence description",
    "type": "organization" or "single_application"
  }
]

Return 4-6 quality results with official URLs.`;

    const response = await callClaude({
      systemPrompt: 'You are an expert on Indian government schemes. Return ONLY valid JSON.',
      userPrompt: prompt,
      enableWebSearch: true,
      maxWebSearchUses: 10,
      temperature: 0.3,
    });

    logClaudeUsage('find-category-schemes', response.tokensUsed, response.webSearchUsed || false);
    console.log('AI response:', JSON.stringify(response));

    let schemes;
    try {
      const content = response.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        schemes = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI response');
    }

    return new Response(
      JSON.stringify({ schemes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-category-schemes:', error);
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