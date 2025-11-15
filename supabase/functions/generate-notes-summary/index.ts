// Generate Notes Summary - Transform raw content into structured study notes
// Uses Claude Sonnet 4.5 to create clean, organized notes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SummarizeRequest {
  note_id: string;
  raw_content: string;
  language: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { note_id, raw_content, language }: SummarizeRequest = await req.json();

    if (!note_id || !raw_content) {
      return new Response(JSON.stringify({ error: "note_id and raw_content are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating summary for note:", note_id, "Content length:", raw_content.length);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_status: "summarizing",
        processing_progress: 60,
      })
      .eq("id", note_id);

    // Build the prompt
    const prompt = `You are an expert study assistant specializing in Indian government exams, jobs, and educational content. Transform the following text/content into clean, well-structured study notes optimized for learning and exam preparation.

CRITICAL REQUIREMENTS:
1. Create clear hierarchical sections with descriptive headings
2. Extract and highlight ALL key points as bullet lists
3. Identify and emphasize:
   - Important dates and deadlines (mark as urgent if within 30 days)
   - Eligibility criteria (age, education, nationality)
   - Application fees and payment details
   - Selection process and exam pattern
   - Required documents
   - Application steps and procedures
   - Salary/benefits (if job posting)
   - Contact information and helplines
4. Create a concise 2-3 sentence summary capturing the main purpose
5. Preserve ALL critical information - do NOT omit details
6. Format for maximum readability and comprehension
7. Extract URLs and links separately with clear labels
8. Identify any action items or important deadlines

MARKDOWN FORMATTING RULES (for content field):
1. **Paragraph Length**: NO paragraph should exceed 4 lines (~320 characters)
   - If content is longer, break into multiple short paragraphs OR convert to bullet points
   - Example: Instead of one long 8-line paragraph, create two 3-line paragraphs or a 2-line intro + bullet list
2. **Use Rich Markdown**:
   - Headings: Use ### for subsection titles (already in section.title, don't repeat in content)
   - Bold: Use **text** for important terms, dates, numbers, fees
   - Italic: Use *text* for emphasis or definitions
   - Code/Numbers: Use \`text\` for specific codes, application numbers, reference IDs
   - Highlights: Use ==text== for critical information that needs attention
   - Lists: Use bullet points (- or •) for multiple items
3. **Visual Clarity**:
   - Add blank lines between paragraphs for breathing room
   - Use bullet points for 3+ related items instead of comma-separated lists
   - Bold all numbers (fees, ages, vacancies, dates)
   - Highlight deadlines and urgent information with ==text==
4. **Examples**:
   BAD: "The application fee for general category is Rs. 500 and for SC/ST/OBC is Rs. 250 payable through online mode via debit card, credit card or net banking and candidates must keep the payment receipt for future reference."
   GOOD: "**Application Fee:**\n- General Category: **Rs. 500**\n- SC/ST/OBC: **Rs. 250**\n\nPayment accepted via debit card, credit card, or net banking. ==Keep payment receipt for future reference.=="

OUTPUT FORMAT: Return ONLY valid JSON (no markdown, no backticks):
{
  "title": "Clear, descriptive title (max 100 chars)",
  "summary": "2-3 sentence overview of the content",
  "key_points": [
    "Most important point 1",
    "Most important point 2",
    "Most important point 3"
  ],
  "sections": [
    {
      "title": "Section heading",
      "content": "Main content using markdown formatting. Keep paragraphs under 4 lines. Use **bold**, *italic*, \`code\`, ==highlights==, and bullet points. Example:\n\n**Important Info:** This is a short 2-3 line paragraph with key details.\n\n- First bullet point\n- Second bullet point\n\nAnother short paragraph if needed.",
      "subsections": [
        {
          "title": "Subsection heading",
          "content": "Subsection content with same markdown formatting rules"
        }
      ],
      "highlights": [
        {
          "type": "deadline" | "eligibility" | "fee" | "important" | "action",
          "text": "Highlighted information",
          "date": "YYYY-MM-DD" (if applicable)
        }
      ],
      "links": [
        {
          "text": "Link description",
          "url": "https://...",
          "type": "application" | "notification" | "official" | "resource"
        }
      ]
    }
  ],
  "important_dates": [
    {
      "event": "Application Start",
      "date": "YYYY-MM-DD",
      "is_deadline": false
    },
    {
      "event": "Last Date to Apply",
      "date": "YYYY-MM-DD",
      "is_deadline": true
    }
  ],
  "action_items": [
    "Action that needs to be taken 1",
    "Action that needs to be taken 2"
  ]
}

TEXT TO PROCESS:
${raw_content.substring(0, 30000)}

Remember: Return ONLY the JSON object, nothing else.`;

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 70,
      })
      .eq("id", note_id);

    // Call Claude API
    console.log("Calling Claude API for summarization...");
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 25000,
        temperature: 0.3,
        system:
          "You are an expert study assistant. Always return valid JSON without any markdown formatting or code blocks.",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Claude API error:", errorText);
      throw new Error(`Claude API error: ${errorText}`);
    }

    const anthropicData = await anthropicResponse.json();
    console.log("Claude summarization complete");

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 85,
      })
      .eq("id", note_id);

    // Extract response text
    let responseText = "";
    if (anthropicData.content && anthropicData.content.length > 0) {
      for (const block of anthropicData.content) {
        if (block.type === "text") {
          responseText += block.text;
        }
      }
    }

    if (!responseText.trim()) {
      throw new Error("Empty response from Claude");
    }

    // Clean up response (remove markdown code blocks if present)
    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Parse JSON
    let structuredContent;
    try {
      structuredContent = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      console.error("Response text:", responseText.substring(0, 500));
      throw new Error(`Failed to parse summary: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    console.log("Structured content generated:", Object.keys(structuredContent));

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 95,
      })
      .eq("id", note_id);

    // Store in database
    const { error: updateError } = await supabase
      .from("study_notes")
      .update({
        title: structuredContent.title || "Study Notes",
        summary: structuredContent.summary,
        key_points: structuredContent.key_points || [],
        structured_content: structuredContent,
        processing_status: "completed",
        processing_progress: 100,
        processing_error: null,
      })
      .eq("id", note_id);

    if (updateError) {
      console.error("Failed to update note with summary:", updateError);
      throw updateError;
    }

    console.log("Summary stored in database, note processing complete");

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        title: structuredContent.title,
        sections_count: structuredContent.sections?.length || 0,
        key_points_count: structuredContent.key_points?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in generate-notes-summary:", error);

    // Update note status to failed
    try {
      const bodyText = await req.text();
      const body = JSON.parse(bodyText);
      if (body.note_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        await supabase
          .from("study_notes")
          .update({
            processing_status: "failed",
            processing_error: error instanceof Error ? error.message : "Summary generation failed",
          })
          .eq("id", body.note_id);
      }
    } catch (e) {
      console.error("Failed to update error status:", e);
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
