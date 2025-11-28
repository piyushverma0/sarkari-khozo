// Process Query - Extract detailed government application information
// Model: Claude Sonnet 4.5 with web search

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessQueryRequest {
  query: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query }: ProcessQueryRequest = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing query:", query);

    // Implement tool use loop for web search
    const messages: any[] = [
      {
        role: "user",
        content: `You are an expert at extracting information about Indian government applications, exams, jobs, and schemes.

User Query: "${query}"

CRITICAL DATE EXTRACTION RULES (HIGHEST PRIORITY):
1. ALWAYS search these sources for dates (in priority order):
   - Official government website (ssc.nic.in, upsc.gov.in, rrbcdg.gov.in, ibps.in, railway.gov.in, etc.)
   - Sarkari Result (sarkariresult.com) - most reliable for exam dates
   - Testbook (testbook.com) - comprehensive date tracking
   - Careers360 (careers360.com) - verified exam information
   - Career Power (careerpower.in) - detailed exam schedules
   - Official notification PDFs from government portals
   - Times of India and Indian Express education sections

2. DATE EXTRACTION METHODOLOGY:
   - Search official notification PDFs first
   - Check exam calendar pages on official government portals
   - Look for "important dates" sections on official sites
   - Cross-verify dates from multiple reliable sources

3. KEY DATES TO EXTRACT:
   - application_start, application_end, admit_card_date, exam_date, result_date
   - correction_window_start, correction_window_end
   - date_confidence: "verified" | "estimated" | "tentative"
   - date_source: URL where dates were found
   - last_verified: Current timestamp

4. Return JSON with these fields:
   {
     "title": "Full name of the exam/job/scheme",
     "description": "Detailed description (2-3 sentences)",
     "url": "Official URL",
     "category": "exams" | "jobs" | "schemes" | "policies",
     "important_dates": {
       "application_start": "YYYY-MM-DD",
       "application_end": "YYYY-MM-DD",
       "exam_date": "YYYY-MM-DD",
       "admit_card_date": "YYYY-MM-DD",
       "result_date": "YYYY-MM-DD",
       "correction_window_start": "YYYY-MM-DD",
       "correction_window_end": "YYYY-MM-DD",
       "date_confidence": "verified" | "estimated" | "tentative",
       "date_source": "URL",
       "last_verified": "ISO timestamp"
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

5. STATISTICS EXTRACTION (IMPORTANT):
   - Look for vacancy counts in official notifications, PDFs, and government portals
   - Check previous year statistics on sarkariresult.com, testbook.com, careers360.com
   - Extract competition ratio if available (e.g., "100:1" means 100 applicants per vacancy)
   - Calculate competition_level: LOW (<50:1), MEDIUM (50-100:1), HIGH (>100:1)
   - If statistics not available, set statistics_confidence to "unavailable" and all numeric fields to null
   - Always include the statistics object even if data is unavailable

CRITICAL: You MUST use web_search tool to get CURRENT dates from official sources. Do not rely on training data.
Current Date: ${new Date().toISOString()}`,
      },
    ];

    const systemPrompt = `You are an expert at extracting information about Indian government applications, exams, jobs, and schemes.

CRITICAL OUTPUT FORMAT REQUIREMENT:
- Return ONLY a valid JSON object, nothing else
- Do NOT include any explanatory text before or after the JSON
- Do NOT include phrases like "here's the information" or "based on the available data"
- Output the raw JSON directly without markdown code blocks if possible
- If you must use code blocks, use only: \`\`\`json ... \`\`\`

Example of CORRECT output:
{
  "title": "...",
  "description": "...",
  ...
}

Example of INCORRECT output:
Based on the available information, here's what I found:
\`\`\`json
{
  "title": "...",
  ...
}
\`\`\`

Your output will be parsed directly as JSON, so any extra text will cause parsing errors.`;

    let finalResponse = "";
    let iterationCount = 0;
    const maxIterations = 5; // Prevent infinite loops

    // Tool use loop - continue until Claude provides final answer
    while (iterationCount < maxIterations) {
      iterationCount++;
      console.log(`Tool use iteration ${iterationCount}`);

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
          system: systemPrompt,
          messages: messages,
          tools: [
            {
              name: "web_search",
              description: "Search the web for current information from Indian government portals and reliable sources",
              input_schema: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The search query to find information",
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
        return new Response(JSON.stringify({ error: "Failed to process query", details: error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      console.log(`Iteration ${iterationCount} response:`, JSON.stringify(data, null, 2));

      // Check if Claude wants to use tools
      let hasToolUse = false;
      const toolResults: any[] = [];

      for (const block of data.content) {
        if (block.type === "tool_use") {
          hasToolUse = true;
          console.log("Tool use requested:", block.name, block.input);

          // For now, we'll mock web search results since we don't have actual web search
          // In production, you'd integrate with a real search API
          const searchQuery = block.input.query;
          const mockResults = `Search results for "${searchQuery}": Please check official government portals like ssc.nic.in, upsc.gov.in, or sarkariresult.com for the latest information.`;

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: mockResults,
          });
        } else if (block.type === "text") {
          finalResponse = block.text;
        }
      }

      // If no tool use, we have the final answer
      if (!hasToolUse) {
        break;
      }

      // Add assistant's response and tool results to messages
      messages.push({
        role: "assistant",
        content: data.content,
      });

      messages.push({
        role: "user",
        content: toolResults,
      });
    }

    // Parse the JSON response from Claude
    try {
      // Check if we got a response
      if (!finalResponse || finalResponse.trim().length === 0) {
        console.error("No response received from Claude after tool use loop");
        return new Response(
          JSON.stringify({
            error: "Unable to process query",
            message: "No response received from AI. Please try again or rephrase your query.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Extract JSON from response (handle various formats)
      let jsonText = finalResponse.trim();

      // Try to extract JSON from markdown code blocks first
      const jsonBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonBlockMatch) {
        jsonText = jsonBlockMatch[1].trim();
      } else {
        // If no code block, try to find JSON object directly
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }
      }

      // Validate we have JSON to parse
      if (!jsonText || jsonText.length === 0) {
        console.error("No JSON found in response:", finalResponse);
        return new Response(
          JSON.stringify({
            error: "Invalid response format",
            message: "Unable to extract information. Please try again with a more specific query.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const applicationData = JSON.parse(jsonText);

      // Sanitize application_guidance field
      if (applicationData.application_guidance) {
        if (typeof applicationData.application_guidance === "string") {
          // Convert string to proper object format
          applicationData.application_guidance = {
            online_steps: applicationData.application_guidance ? [applicationData.application_guidance] : [],
            csc_applicable: false,
            csc_guidance: "",
            state_officials_applicable: false,
            state_officials_guidance: "",
            helpline: "",
            email: "",
            estimated_time: "",
          };
        } else if (typeof applicationData.application_guidance !== "object") {
          // Invalid type, set to null
          applicationData.application_guidance = null;
        }
      }

      // Sanitize deadline_reminders field
      if (applicationData.deadline_reminders) {
        if (Array.isArray(applicationData.deadline_reminders)) {
          // Check if array contains strings instead of objects
          applicationData.deadline_reminders = applicationData.deadline_reminders.map((item: any) => {
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
          applicationData.deadline_reminders = [];
        }
      }

      // Ensure all array fields are properly initialized
      if (!Array.isArray(applicationData.application_steps)) {
        applicationData.application_steps = [];
      }
      if (!Array.isArray(applicationData.documents_required)) {
        applicationData.documents_required = [];
      }
      if (!Array.isArray(applicationData.deadline_reminders)) {
        applicationData.deadline_reminders = [];
      }
      if (applicationData.active_opportunities && !Array.isArray(applicationData.active_opportunities)) {
        applicationData.active_opportunities = [];
      }
      if (applicationData.expired_opportunities && !Array.isArray(applicationData.expired_opportunities)) {
        applicationData.expired_opportunities = [];
      }

      // Ensure application_guidance.online_steps is an array
      if (
        applicationData.application_guidance?.online_steps &&
        !Array.isArray(applicationData.application_guidance.online_steps)
      ) {
        applicationData.application_guidance.online_steps = [];
      }

      // CRITICAL FIX: Convert all dates to ISO 8601 format with timezone
      // Android app uses Instant.parse() which requires format: "YYYY-MM-DDTHH:mm:ssZ"
      if (applicationData.important_dates) {
        console.log("Processing important_dates:", JSON.stringify(applicationData.important_dates));

        const dateFields = [
          "application_start",
          "application_end",
          "admit_card_date",
          "exam_date",
          "result_date",
          "correction_window_start",
          "correction_window_end",
        ];

        for (const field of dateFields) {
          const dateValue = applicationData.important_dates[field];
          if (
            dateValue &&
            dateValue !== "Not yet announced" &&
            dateValue !== "TBA" &&
            dateValue !== "To be announced"
          ) {
            try {
              // If it's already in ISO format, keep it
              if (dateValue.includes("T") && dateValue.includes("Z")) {
                console.log(`${field} already in ISO format: ${dateValue}`);
                continue;
              }

              // Convert YYYY-MM-DD or other formats to ISO 8601
              // Use UTC midnight for date-only values
              const dateOnly = dateValue.match(/^\d{4}-\d{2}-\d{2}$/);
              if (dateOnly) {
                applicationData.important_dates[field] = `${dateValue}T00:00:00Z`;
                console.log(`✓ Converted ${field}: ${dateValue} -> ${applicationData.important_dates[field]}`);
              } else {
                // Try parsing other date formats
                const parsedDate = new Date(dateValue);
                if (!isNaN(parsedDate.getTime())) {
                  applicationData.important_dates[field] = parsedDate.toISOString();
                  console.log(`✓ Converted ${field}: ${dateValue} -> ${applicationData.important_dates[field]}`);
                } else {
                  console.warn(`⚠️ Unable to parse date for ${field}: ${dateValue}`);
                }
              }
            } catch (e) {
              console.error(`❌ Error converting date for ${field}:`, e);
            }
          } else if (dateValue) {
            console.log(`Skipping ${field}: ${dateValue} (placeholder text)`);
          }
        }

        // Add last_verified timestamp if not present
        if (!applicationData.important_dates.last_verified) {
          applicationData.important_dates.last_verified = new Date().toISOString();
        }

        console.log("Final important_dates:", JSON.stringify(applicationData.important_dates));
      } else {
        console.warn("⚠️ No important_dates found in application data");
      }

      return new Response(JSON.stringify(applicationData), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseError) {
      console.error("Failed to parse Claude response:", parseError);
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
    console.error("Error in process-query:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
