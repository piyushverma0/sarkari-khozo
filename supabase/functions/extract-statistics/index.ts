// Extract Statistics - Dedicated function for comprehensive statistics extraction
// Model: Sonar Pro with GPT-4-turbo fallback with web search
// Purpose: Extract vacancy counts, applicant numbers, competition ratios from official sources

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, logAIUsage } from "../_shared/ai-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractStatisticsRequest {
  applicationId: string;
  title: string;
  url: string;
  extractHistorical?: boolean; // If true, extract last 5 years of data
  description?: string; // Application description for better context
  category?: string; // Application category (SSC, Railway, Banking, etc.)
}

interface StatisticsData {
  year: number;
  vacancies: number | null;
  applicants_count: number | null;
  competition_ratio: string | null;
  data_source: string;
  data_confidence: "verified" | "estimated" | "community";
  confidence_score: number;
  source_quote: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      applicationId,
      title,
      url,
      extractHistorical = true,
      description,
      category,
    }: ExtractStatisticsRequest = await req.json();

    if (!applicationId || !title || !url) {
      return new Response(JSON.stringify({ error: "applicationId, title, and url are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Extracting statistics for:", title, url, category ? `(${category})` : "");

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const currentYear = new Date().getFullYear();
    const userPrompt = extractHistorical
      ? `You are an expert at extracting statistical data about Indian government exams, jobs, and schemes.

Application: "${title}"${category ? `\nCategory: ${category}` : ""}${description ? `\nDescription: ${description}` : ""}
Official URL: ${url}
Current Year: ${currentYear}

TASK: Extract comprehensive statistics for this application, including historical data from the last 5 years (${currentYear - 4} to ${currentYear}).

CRITICAL INSTRUCTIONS:
1. Use web_search to find statistics from these sources (in priority order):
   - Official notification PDFs from government portals
   - Official website statistics pages
   - Sarkari Result (sarkariresult.com) - historical data
   - Testbook (testbook.com) - competition statistics
   - Careers360 (careers360.com) - verified exam data
   - Career Power (careerpower.in) - detailed statistics
   - Official RTI responses and government reports

2. For EACH YEAR (last 5 years), extract:
   - Number of vacancies/posts
   - Number of applicants/candidates
   - Competition ratio (applicants per vacancy)
   - Source URL where data was found
   - Confidence level: "verified" (official source), "estimated" (calculated), "community" (unofficial)
   - Exact quote from source (if available)

3. Return JSON array with statistics for each year:
[
  {
    "year": ${currentYear},
    "vacancies": number | null,
    "applicants_count": number | null,
    "competition_ratio": "100:1" | null,
    "data_source": "URL",
    "data_confidence": "verified" | "estimated" | "community",
    "confidence_score": 0.0-1.0,
    "source_quote": "Exact text from source" | null
  }
]

4. CALCULATION RULES:
   - If you have vacancies and applicants, calculate ratio: applicants/vacancies:1
   - If you have ratio and one value, calculate the missing value
   - If data is unavailable for a year, set all numeric fields to null for that year
   - Always include all 5 years in the response, even if some have no data

5. CONFIDENCE SCORING:
   - verified (0.9-1.0): Official government source with exact numbers
   - estimated (0.5-0.8): Calculated or from reliable third-party sources
   - community (0.1-0.4): Unofficial sources or user-reported data

CRITICAL: You MUST use web_search extensively to find accurate current data. Search multiple sources to verify statistics.`
      : `You are an expert at extracting statistical data about Indian government exams, jobs, and schemes.

Application: "${title}"${category ? `\nCategory: ${category}` : ""}${description ? `\nDescription: ${description}` : ""}
Official URL: ${url}
Current Year: ${currentYear}

TASK: Extract CURRENT YEAR statistics for this application.

Extract the same data format as above but ONLY for the current year (${currentYear}).

Use web_search to find the most recent vacancy and applicant statistics from official sources.`;

    const systemPrompt = `You are an expert at extracting statistical data about Indian government applications.

CRITICAL OUTPUT FORMAT:
- Return ONLY a valid JSON array, nothing else
- Do NOT include explanatory text before or after the JSON
- Output raw JSON directly without markdown code blocks if possible
- If you must use code blocks, use only: \`\`\`json ... \`\`\`

Example CORRECT output:
[
  {
    "year": 2024,
    "vacancies": 5000,
    "applicants_count": 150000,
    "competition_ratio": "30:1",
    "data_source": "https://example.gov.in",
    "data_confidence": "verified",
    "confidence_score": 0.95,
    "source_quote": "Total vacancies: 5000"
  }
]

Your output will be parsed directly as JSON.`;

    console.log("Calling AI (Sonar Pro → GPT-4-turbo) to extract statistics...");

    // Call AI with web search enabled
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      enableWebSearch: true,
      temperature: 0.3,
      maxTokens: 4096,
      responseFormat: "json",
    });

    logAIUsage("extract-statistics", aiResponse.tokensUsed, aiResponse.webSearchUsed, aiResponse.modelUsed);
    console.log("AI response received, parsing JSON...");

    const finalResponse = aiResponse.content;

    // Parse the JSON response
    try {
      if (!finalResponse || finalResponse.trim().length === 0) {
        console.error("No response received from AI");
        return new Response(
          JSON.stringify({
            error: "Unable to extract statistics",
            message: "No response received. Please try again.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Check if AI returned an error message instead of statistics
      if (finalResponse.includes('"error"') || finalResponse.toLowerCase().includes("unable to")) {
        console.error("AI returned error:", finalResponse);
        return new Response(
          JSON.stringify({
            error: "AI could not extract statistics",
            message: "The AI model could not find statistics for this application.",
            ai_response: finalResponse,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Extract JSON from response
      let jsonText = finalResponse.trim();
      const jsonBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonBlockMatch) {
        jsonText = jsonBlockMatch[1].trim();
      } else {
        const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }
      }

      if (!jsonText || jsonText.length === 0) {
        console.error("No JSON found in response:", finalResponse);
        return new Response(
          JSON.stringify({
            error: "Invalid response format",
            message: "Unable to extract statistics. Please try again.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const statisticsArray: StatisticsData[] = JSON.parse(jsonText);

      // Validate that we got an array
      if (!Array.isArray(statisticsArray)) {
        console.error("Response is not an array:", statisticsArray);
        return new Response(
          JSON.stringify({
            error: "Invalid response format",
            message: "Expected statistics array but got different format.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Validate and insert into database
      const insertResults = [];
      for (const stat of statisticsArray) {
        // Skip if no useful data
        if (!stat.vacancies && !stat.applicants_count && !stat.competition_ratio) {
          console.log(`Skipping year ${stat.year} - no data available`);
          continue;
        }

        // Insert or update in scheme_stats table
        const { data: insertData, error: insertError } = await supabase
          .from("scheme_stats")
          .upsert(
            {
              application_id: applicationId,
              year: stat.year,
              applicants_count: stat.applicants_count,
              vacancies: stat.vacancies,
              competition_ratio: stat.competition_ratio,
              data_source: stat.data_source,
              data_confidence: stat.data_confidence,
              confidence_score: stat.confidence_score,
              source_quote: stat.source_quote,
              created_at: new Date().toISOString(),
            },
            {
              onConflict: "application_id,year",
            },
          )
          .select();

        if (insertError) {
          console.error("Failed to insert statistics:", insertError);
          insertResults.push({
            year: stat.year,
            success: false,
            error: insertError.message,
          });
        } else {
          console.log(`Successfully inserted statistics for year ${stat.year}`);
          insertResults.push({
            year: stat.year,
            success: true,
            data: insertData,
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          statistics: statisticsArray,
          insertResults: insertResults,
          message: `Extracted statistics for ${statisticsArray.length} years`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (parseError) {
      console.error("Failed to parse statistics response:", parseError);
      console.error("Response text:", finalResponse);

      return new Response(
        JSON.stringify({
          error: "Failed to parse statistics data",
          raw_response: finalResponse,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Error in extract-statistics:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
