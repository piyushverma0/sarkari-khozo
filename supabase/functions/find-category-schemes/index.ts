// Find Category Opportunities - AI-powered category browsing
// Model: Sonar Pro with GPT-4-turbo fallback with web search

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, logAIUsage } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CategoryRequest {
  category: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { category }: CategoryRequest = await req.json();

    if (!category) {
      return new Response(JSON.stringify({ error: "Category is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Finding opportunities for category:", category);

    const systemPrompt = `You are an expert on Indian government schemes, applications, exams, and job opportunities. Return ONLY valid JSON.`;

    const userPrompt = `You are an expert on Indian government schemes, applications, exams, and job opportunities.

Category: "${category}"

Task: Return 4-6 of the most important, popular, and currently active official Indian government
schemes, exams, jobs, or applications for this category.

Focus on:
- Official government schemes (.gov.in domains preferred)
- Currently active or regularly conducted programs
- High-impact schemes that many people use
- Mix of different types (scholarships, welfare schemes, exams, jobs)

CRITICAL DEADLINE FILTERING:
- ONLY return opportunities that are CURRENTLY OPEN or have UPCOMING deadlines
- DO NOT return opportunities whose application deadlines have already passed
- For single applications: verify the application deadline is in the FUTURE
- For organizations: only include if they have active/upcoming opportunities
- Current Date: ${new Date().toISOString()}

CRITICAL: Determine TYPE of each result:
- "organization": Organizations conducting MULTIPLE exams/schemes (RRB, SSC, UPSC, IBPS, State PSCs)
  Example: SSC conducts CGL, CHSL, MTS, GD, etc. - it's an organization
- "single_application": Single schemes/jobs/exams (specific job notifications, welfare schemes, scholarships)
  Example: "SSC CGL 2024" or "PM Scholarship Scheme" - single applications

For each result, provide:
{
  "title": "Full official name",
  "url": "https://official-website.gov.in/...",
  "description": "Clear description of what this is (2-3 sentences)",
  "type": "organization" | "single_application",
  "category": "${category}"
}

Return JSON array of 4-6 opportunities:
{
  "success": true,
  "category": "${category}",
  "opportunities": [
    { "title": "...", "url": "...", "description": "...", "type": "...", "category": "..." }
  ]
}

CRITICAL: Use web search to find CURRENTLY ACTIVE opportunities with accurate URLs.
Do NOT make up URLs. Search official government portals.
Current Date: ${new Date().toISOString()}`;

    console.log("Calling AI (Sonar Pro → GPT-4-turbo) to find opportunities...");

    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      enableWebSearch: true,
      temperature: 0.3,
      maxTokens: 4096,
      responseFormat: "json",
    });

    logAIUsage("find-category-opportunities", aiResponse.tokensUsed, aiResponse.webSearchUsed, aiResponse.modelUsed);
    console.log("AI response received, parsing JSON...");

    const finalResponse = aiResponse.content;

    // Parse JSON response
    try {
      let jsonText = finalResponse.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const result = JSON.parse(jsonText);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Response text:", finalResponse);

      return new Response(
        JSON.stringify({
          error: "Failed to parse opportunities",
          raw_response: finalResponse,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error: unknown) {
    console.error("Error in find-category-opportunities:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
