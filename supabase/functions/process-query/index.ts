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
     "eligibility": "Eligibility criteria",
     "fee_structure": "Fee details",
     "documents_required": ["Document 1", "Document 2"],
     "application_steps": ["Step 1", "Step 2"],
     "application_guidance": "Detailed guidance on how to apply",
     "deadline_reminders": ["Reminder 1", "Reminder 2"]
   }

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

      const applicationData = JSON.parse(jsonText);

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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
