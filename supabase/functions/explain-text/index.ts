// Explain Text - AI-powered text explanations with web search
// Uses Gemini 2.0 Flash with web grounding for comprehensive explanations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callGemini, logGeminiUsage } from "../_shared/gemini-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Helper function to generate hash for caching
async function generateTextHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExplainTextRequest {
  text: string;
  context?: string; // Optional context from the note
  note_id?: string; // Optional note ID for logging
  user_id?: string; // Optional user ID for logging
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, context, note_id, user_id }: ExplainTextRequest = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Explaining text:", text.substring(0, 100));

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate hash for caching
    const textHash = await generateTextHash(text);
    console.log("Text hash generated:", textHash.substring(0, 16) + "...");

    // Check if we have a cached explanation
    try {
      const { data: cachedExplanation, error: cacheError } = await supabase
        .from("ai_explanations")
        .select("*")
        .eq("text_hash", textHash)
        .single();

      if (cachedExplanation && !cacheError) {
        console.log("Cache hit! Returning cached explanation");

        // Increment usage count asynchronously (don't wait)
        (async () => {
          try {
            await supabase.rpc("increment_explanation_usage", {
              explanation_id: cachedExplanation.id,
            });
            console.log("Usage count incremented");
          } catch (err) {
            console.error("Failed to increment usage count:", err);
          }
        })();

        // Return cached result
        return new Response(
          JSON.stringify({
            success: true,
            selected_text: text,
            explanation: cachedExplanation.explanation,
            key_points: cachedExplanation.key_points,
            examples: cachedExplanation.examples || [],
            related_info: cachedExplanation.related_info,
            exam_tips: cachedExplanation.exam_tips || [],
            difficulty_level: cachedExplanation.difficulty_level,
            estimated_read_time: cachedExplanation.estimated_read_time,
            cached: true,
            usage_count: cachedExplanation.usage_count,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } else {
        console.log("Cache miss. Generating new explanation...");
      }
    } catch (cacheCheckError) {
      console.error("Cache check failed:", cacheCheckError);
      // Continue to generate new explanation
    }

    // Build the explanation prompt
    const systemPrompt =
      "You are an expert educator creating concise, beautifully formatted explanations. Use rich markdown (bold, italic, highlights, tables, formulas). Keep responses focused and appropriate to query complexity. Always return valid JSON without markdown code blocks.";

    const userPrompt = `Create a concise, well-formatted explanation for students preparing for Indian government exams and jobs.

SELECTED TEXT:
"${text}"

${context ? `\nCONTEXT:\n${context.substring(0, 800)}` : ""}

INSTRUCTIONS:
1. Keep explanation **concise** and **focused** - match depth to the complexity of the selected text
2. For simple terms: 2-3 sentences. For complex topics: 1-2 short paragraphs max
3. Use rich markdown formatting:
   - **Bold** for key terms and important concepts
   - *Italic* for emphasis
   - ==Highlight== for critical information
   - Tables for comparisons (use markdown table syntax)
   - Math formulas: LaTeX format like $E=mc^2$ or $$\\frac{a}{b}$$
   - Chemistry: H₂O, CO₂ (use subscripts)
   - Regex patterns: \`/[a-z]+/\` (use code syntax)
4. Provide 2-3 key points maximum
5. Add 1-2 examples only if helpful
6. Include exam tips only if relevant to exams/jobs
7. Keep language simple and student-friendly

OUTPUT FORMAT - Return ONLY valid JSON:
{
  "explanation": "Concise explanation (2-3 sentences for simple terms, 1-2 paragraphs for complex topics). Use **bold**, *italic*, ==highlights==, tables, formulas, etc.",
  "key_points": ["2-3 essential points only"],
  "examples": [{"title": "Title", "description": "Brief description"}],
  "related_info": {"current_updates": "Only if relevant", "official_links": []},
  "exam_tips": ["Only if exam-relevant"],
  "difficulty_level": "beginner" | "intermediate" | "advanced",
  "estimated_read_time": "1-2 min"
}

Date: ${new Date().toISOString()}

IMPORTANT:
- Return ONLY the JSON object
- Keep explanations concise - quality over quantity
- Use rich formatting for better readability
- Use web search if current information is needed`;

    // Call Gemini API with web grounding enabled
    console.log("Calling Gemini API with web grounding...");
    const geminiResponse = await callGemini({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 2048,
      responseFormat: "json",
      enableWebSearch: true, // Enable web search for current information
    });

    logGeminiUsage("explain-text", geminiResponse.tokensUsed, geminiResponse.webSearchUsed);

    console.log("Gemini explanation generation complete");

    // Extract response text
    let responseText = geminiResponse.content;

    if (!responseText.trim()) {
      throw new Error("Empty response from Gemini");
    }

    // Clean up response (remove markdown code blocks if present)
    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Parse JSON
    let explanationData;
    try {
      explanationData = JSON.parse(cleanedJson);
    } catch (parseError: unknown) {
      console.error("Failed to parse JSON:", parseError);
      console.error("Response text:", responseText.substring(0, 500));
      const errorMessage = parseError instanceof Error ? parseError.message : "Unknown parse error";
      throw new Error(`Failed to parse explanation: ${errorMessage}`);
    }

    console.log("Explanation generated successfully");

    // Cache the explanation for future use
    try {
      const { error: insertError } = await supabase.from("ai_explanations").insert({
        text_hash: textHash,
        text_content: text.substring(0, 1000), // Store first 1000 chars
        explanation: explanationData.explanation,
        key_points: explanationData.key_points || [],
        examples: explanationData.examples || [],
        related_info: explanationData.related_info,
        exam_tips: explanationData.exam_tips || [],
        difficulty_level: explanationData.difficulty_level,
        estimated_read_time: explanationData.estimated_read_time,
        usage_count: 1,
      });

      if (insertError) {
        console.error("Failed to cache explanation:", insertError);
        // Continue anyway - caching failure shouldn't break the response
      } else {
        console.log("Explanation cached successfully");
      }
    } catch (cacheError) {
      console.error("Cache insert error:", cacheError);
      // Continue anyway
    }

    return new Response(
      JSON.stringify({
        success: true,
        selected_text: text,
        ...explanationData,
        cached: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error in explain-text:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
