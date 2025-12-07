// Find Category Schemes - AI-powered category browsing
// Model: Sonar Pro with GPT-4-turbo fallback with web search
// Returns: { schemes: [...] } format for Android app compatibility

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, logAIUsage } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CategoryRequest {
  category: string;
}

interface Scheme {
  title: string;
  url: string;
  description: string;
  type: "organization" | "single_application";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category }: CategoryRequest = await req.json();

    if (!category) {
      return new Response(JSON.stringify({ error: "Category is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Finding schemes for category:", category);

    const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    const currentYear = new Date().getFullYear();

    const systemPrompt = `You are an expert on Indian government schemes, applications, exams, and job opportunities.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no explanations, just JSON
2. All schemes must be CURRENTLY ACTIVE or have UPCOMING deadlines
3. All URLs must be REAL and VERIFIED through web search
4. Focus on HIGH-IMPACT, POPULAR schemes that many people apply to
5. Prefer official .gov.in domains`;

    const userPrompt = `Category: "${category}"
Current Date: ${currentDate}
Current Year: ${currentYear}

Task: Find 4-6 of the MOST IMPORTANT, POPULAR, and CURRENTLY ACTIVE official Indian government schemes, exams, jobs, or applications for this category.

CRITICAL REQUIREMENTS:

1. DEADLINE FILTERING (MOST IMPORTANT):
   - ONLY return opportunities that are CURRENTLY OPEN or have UPCOMING deadlines in ${currentYear} or beyond
   - DO NOT return expired opportunities from previous years
   - For single applications: Verify the application deadline is in the FUTURE (after ${currentDate})
   - For organizations: Only include if they REGULARLY conduct exams/schemes (like SSC, UPSC, RRB)
   - If an opportunity's deadline has passed, SKIP IT

2. TYPE CLASSIFICATION (CRITICAL):
   - "organization": Government bodies that conduct MULTIPLE exams/recruitments REGULARLY
     Examples:
     ✓ Staff Selection Commission (SSC) - conducts CGL, CHSL, MTS, GD annually
     ✓ Railway Recruitment Board (RRB) - conducts NTPC, Group D, ALP, RPF regularly
     ✓ Union Public Service Commission (UPSC) - conducts Civil Services, CDS, NDA annually
     ✓ Institute of Banking Personnel Selection (IBPS) - conducts PO, Clerk, RRB annually
     ✓ State PSCs (UPPSC, BPSC, etc.) - conduct state civil services regularly

   - "single_application": ONE-TIME schemes, specific job notifications, or welfare programs
     Examples:
     ✓ "SSC CGL 2025" - specific exam cycle of SSC
     ✓ "RRB NTPC 2024" - specific recruitment cycle
     ✓ "PM Kisan Samman Nidhi" - welfare scheme
     ✓ "NEET UG 2025" - annual exam (specific year)
     ✓ "Indian Navy SSR Recruitment 2025" - specific recruitment

3. URL VERIFICATION:
   - You MUST use web_search to find REAL, CURRENT, WORKING URLs
   - Verify the URLs are for ACTIVE opportunities, not archived pages
   - Prefer official government websites (.gov.in, .nic.in)
   - DO NOT make up or guess URLs

4. QUALITY OVER QUANTITY:
   - Focus on HIGH-IMPACT schemes that affect MANY people
   - Prioritize popular and well-known opportunities
   - Include a MIX of types: organizations, welfare schemes, exams, jobs

5. DESCRIPTION REQUIREMENTS:
   - Write CLEAR, HELPFUL descriptions (2-3 sentences)
   - Mention key details: who can apply, benefits, frequency
   - For organizations: mention the types of exams they conduct
   - For single applications: mention deadlines if known

RESPONSE FORMAT:
Return ONLY this JSON structure, nothing else:
[
  {
    "title": "Official full name of the scheme/exam/organization",
    "url": "https://official-website.gov.in/...",
    "description": "Clear 2-3 sentence description with key details",
    "type": "organization" or "single_application"
  }
]

SEARCH STRATEGY:
1. Search for: "${category} government schemes ${currentYear}"
2. Search for: "${category} exams ${currentYear} India"
3. Search for: "${category} jobs gov.in ${currentYear}"
4. Verify each result has an active, official URL
5. Filter out expired or outdated opportunities

Return 4-6 HIGH-QUALITY, VERIFIED results.`;

    const response = await callAI({
      systemPrompt,
      userPrompt,
      enableWebSearch: true,
      maxWebSearchUses: 15, // Increased for better accuracy
      temperature: 0.3,
      maxTokens: 4096,
    });

    logAIUsage("find-category-schemes", response.tokensUsed, response.webSearchUsed, response.modelUsed);
    console.log("AI response received, parsing JSON...");

    // Parse JSON response with robust extraction
    let schemes: Scheme[];
    try {
      let jsonText = response.content.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Try to find JSON array in the response
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        schemes = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing the whole response
        schemes = JSON.parse(jsonText);
      }

      // Validate the parsed schemes
      if (!Array.isArray(schemes)) {
        throw new Error("Response is not an array");
      }

      if (schemes.length === 0) {
        throw new Error("No schemes found in response");
      }

      // Validate each scheme has required fields
      for (const scheme of schemes) {
        if (!scheme.title || !scheme.url || !scheme.description || !scheme.type) {
          throw new Error(`Invalid scheme structure: ${JSON.stringify(scheme)}`);
        }
        if (scheme.type !== "organization" && scheme.type !== "single_application") {
          throw new Error(`Invalid scheme type: ${scheme.type}`);
        }
      }

      console.log(`Successfully parsed ${schemes.length} schemes`);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response:", response.content);

      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response",
          details: parseError instanceof Error ? parseError.message : "Unknown parse error",
          raw_response: response.content.substring(0, 500), // First 500 chars for debugging
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Return in the format expected by Android app
    return new Response(JSON.stringify({ schemes }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in find-category-schemes:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
