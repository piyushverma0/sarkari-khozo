// Extract Application - Extract details from a specific opportunity
// Model: Sonar Pro with GPT-4-turbo fallback with web search

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, logAIUsage } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractRequest {
  title: string;
  url: string;
  type: "organization" | "single_application";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, url, type }: ExtractRequest = await req.json();

    if (!title || !url) {
      return new Response(JSON.stringify({ error: "Title and URL are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Extracting application:", title, url, type);

    const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    const currentYear = new Date().getFullYear();

    // Different prompts based on type
    const systemPrompt = `You are an expert at extracting information about Indian government applications, exams, jobs, and schemes.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no explanations, just JSON
2. Use web_search to find accurate, current information
3. All dates must be verified and in YYYY-MM-DD format
4. Filter out expired opportunities`;

    const userPrompt =
      type === "organization"
        ? `Organization: "${title}"
Website: ${url}
Current Date: ${currentDate}
Current Year: ${currentYear}

Task: Find ALL CURRENTLY ACTIVE exams, jobs, or schemes from this organization.

CRITICAL DEADLINE FILTERING:
- ONLY return opportunities that are CURRENTLY OPEN or have UPCOMING deadlines
- DO NOT include opportunities whose application deadlines have already passed
- Current Date: ${currentDate}
- Filter out any exam/job/scheme with application_end date before ${currentDate}

Search the official website and return a list of ALL active opportunities.

Return ONLY this JSON (no markdown, no code blocks):
{
  "organization_name": "${title}",
  "organization_url": "${url}",
  "active_opportunities": [
    {
      "title": "Full exam/job name",
      "description": "Clear description (2-3 sentences)",
      "url": "Direct URL to the opportunity",
      "important_dates": {
        "application_start": "YYYY-MM-DD",
        "application_end": "YYYY-MM-DD",
        "exam_date": "YYYY-MM-DD"
      },
      "eligibility": "Eligibility criteria"
    }
  ]
}

CRITICAL: Use web_search to find CURRENT active opportunities with accurate dates.`
        : `Application: "${title}"
URL: ${url}
Current Date: ${currentDate}
Current Year: ${currentYear}

Task: Extract complete details about this application/exam/job/scheme.

CRITICAL DATE EXTRACTION RULES:
1. Search official website: ${url}
2. Cross-check with: sarkariresult.com, testbook.com, careers360.com
3. Look for official notification PDFs
4. VERIFY that application_end date is in the FUTURE (not expired)
5. Current Date: ${currentDate}

Return ONLY this JSON (no markdown, no code blocks):
{
  "title": "${title}",
  "description": "Detailed description",
  "url": "${url}",
  "category": "exams" | "jobs" | "schemes" | "policies",
  "important_dates": {
    "application_start": "YYYY-MM-DD",
    "application_end": "YYYY-MM-DD",
    "exam_date": "YYYY-MM-DD",
    "admit_card_date": "YYYY-MM-DD",
    "result_date": "YYYY-MM-DD",
    "date_confidence": "verified" | "estimated",
    "date_source": "URL"
  },
  "statistics": {
    "vacancies": number | null,
    "expected_applicants": number | null,
    "previous_year_applicants": number | null,
    "competition_ratio": "X:1" | null,
    "competition_level": "LOW" | "MEDIUM" | "HIGH" | null,
    "statistics_source": "URL" | null,
    "statistics_confidence": "verified" | "estimated" | "unavailable",
    "year": number
  },
  "eligibility": "Eligibility criteria",
  "fee_structure": "Fee details",
  "documents_required": ["Document 1", "Document 2"],
  "application_steps": ["Step 1", "Step 2"],
  "application_guidance": {
    "online_steps": ["Step 1", "Step 2"],
    "csc_applicable": true | false,
    "csc_guidance": "Instructions for CSC",
    "state_officials_applicable": true | false,
    "state_officials_guidance": "Instructions for state officials",
    "helpline": "Phone number",
    "email": "Email address",
    "estimated_time": "Time estimate"
  },
  "deadline_reminders": [
    {
      "days_before": 7,
      "message": "Reminder message"
    }
  ]
}

STATISTICS EXTRACTION (MANDATORY):
- ALWAYS extract and include statistics for EVERY exam/job/scheme
- Search official notification PDFs for vacancy counts
- Check previous year statistics on sarkariresult.com, testbook.com, careers360.com
- Extract competition ratio and calculate competition_level: LOW (<50:1), MEDIUM (50-100:1), HIGH (>100:1)
- For exams: search for "exam name + statistics", "exam name + cut off", "exam name + previous year data"
- If statistics unavailable after thorough search, set statistics_confidence to "unavailable" and numeric fields to null
- ALWAYS include the statistics object in response, even if data is unavailable

CRITICAL: Use web_search to get CURRENT accurate dates and statistics.`;

    // Call Claude API using shared client
    const response = await callAI({
      systemPrompt,
      userPrompt,
      enableWebSearch: true,
      temperature: 0.3,
      maxTokens: 4096,
    });

    logAIUsage("extract-application", response.tokensUsed, response.webSearchUsed, response.modelUsed);
    console.log("AI response received, parsing JSON...");

    // Parse JSON response with robust extraction
    try {
      let jsonText = response.content.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Try to find JSON object or array in the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/) || jsonText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const result = JSON.parse(jsonText);

      // Sanitize organization response fields
      if (type === "organization") {
        // Ensure required fields are present
        if (!result.organization_name) {
          result.organization_name = title; // Use provided title as fallback
        }
        if (!result.organization_url) {
          result.organization_url = url; // Use provided url as fallback
        }
        if (!result.active_opportunities || !Array.isArray(result.active_opportunities)) {
          result.active_opportunities = []; // Default to empty array if missing
        }
      }

      // Sanitize application_guidance field
      if (result.application_guidance) {
        if (typeof result.application_guidance === "string") {
          // Convert string to proper object format
          result.application_guidance = {
            online_steps: result.application_guidance ? [result.application_guidance] : [],
            csc_applicable: false,
            csc_guidance: "",
            state_officials_applicable: false,
            state_officials_guidance: "",
            helpline: "",
            email: "",
            estimated_time: "",
          };
        } else if (typeof result.application_guidance !== "object") {
          // Invalid type, set to null
          result.application_guidance = null;
        }
      }

      // Sanitize deadline_reminders field
      if (result.deadline_reminders) {
        if (Array.isArray(result.deadline_reminders)) {
          // Check if array contains strings instead of objects
          result.deadline_reminders = result.deadline_reminders.map((item: any) => {
            if (typeof item === "string") {
              return {
                days_before: 7,
                message: item,
              };
            }
            return item;
          });
        } else {
          // Invalid type, set to empty array
          result.deadline_reminders = [];
        }
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response:", response.content);

      return new Response(
        JSON.stringify({
          error: "Failed to parse application data",
          details: parseError instanceof Error ? parseError.message : "Unknown parse error",
          raw_response: response.content.substring(0, 500), // First 500 chars for debugging
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error: unknown) {
    console.error("Error in extract-application:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
