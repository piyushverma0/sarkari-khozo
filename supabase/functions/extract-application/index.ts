// Extract Application - Extract details from a specific opportunity
// Model: Claude Sonnet 4.5 with web search

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

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

    // Different prompts based on type
    const userPrompt =
      type === "organization"
        ? `You are an expert on Indian government recruitment and schemes.

Organization: "${title}"
Website: ${url}

Task: Find ALL CURRENTLY ACTIVE exams, jobs, or schemes from this organization.

Search the official website and return a list of ALL active opportunities with:
- Title
- Description
- Application start/end dates
- Exam date (if applicable)
- Official notification URL
- Eligibility

Return JSON:
{
  "organization_name": "${title}",
  "organization_url": "${url}",
  "active_opportunities": [
    {
      "title": "...",
      "description": "...",
      "url": "...",
      "important_dates": {
        "application_start": "YYYY-MM-DD",
        "application_end": "YYYY-MM-DD",
        "exam_date": "YYYY-MM-DD"
      },
      "eligibility": "..."
    }
  ]
}

CRITICAL: Use web_search to find CURRENT active opportunities.
Current Date: ${new Date().toISOString()}`
        : `You are an expert at extracting information about Indian government applications, exams, jobs, and schemes.

Application: "${title}"
URL: ${url}

CRITICAL DATE EXTRACTION RULES (HIGHEST PRIORITY):
1. Search official website: ${url}
2. Cross-check with: sarkariresult.com, testbook.com, careers360.com
3. Look for official notification PDFs

Extract complete details and return JSON:
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
    "statistics_source": "URL where statistics were found" | null,
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

STATISTICS EXTRACTION:
- Search official notification PDFs for vacancy counts
- Check previous year statistics on sarkariresult.com, testbook.com, careers360.com
- Extract competition ratio and calculate competition_level: LOW (<50:1), MEDIUM (50-100:1), HIGH (>100:1)
- If statistics unavailable, set statistics_confidence to "unavailable" and numeric fields to null
- Always include the statistics object

CRITICAL: Use web_search to get CURRENT accurate dates.
Current Date: ${new Date().toISOString()}`;

    // Call Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        temperature: 0.3,
        system: `You are an expert at extracting information about Indian government applications, exams, jobs, and schemes. Return ONLY valid JSON.`,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        tools: [
          {
            name: "web_search",
            description: "Search the web for current information",
            input_schema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query",
                },
              },
              required: ["query"],
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      return new Response(JSON.stringify({ error: "Failed to extract application", details: error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("Anthropic response:", JSON.stringify(data, null, 2));

    // Extract final text
    let finalResponse = "";
    if (data.content) {
      for (const block of data.content) {
        if (block.type === "text") {
          finalResponse = block.text;
        }
      }
    }

    // Parse JSON
    try {
      let jsonText = finalResponse.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const result = JSON.parse(jsonText);

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
      console.error("Failed to parse response:", parseError);
      console.error("Response text:", finalResponse);

      return new Response(
        JSON.stringify({
          error: "Failed to parse application data",
          raw_response: finalResponse,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Error in extract-application:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
