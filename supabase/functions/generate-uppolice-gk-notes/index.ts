// Generate UP Police General Knowledge Notes - AI-powered exam-focused content generation
// Step 1: Generate comprehensive raw content
// Step 2: Trigger generate-notes-summary for final structuring

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callAI, logAIUsage } from "../_shared/ai-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateNotesRequest {
  note_id: string;
  user_id: string;
  topic?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let note_id: string | undefined;
  let user_id: string | undefined;

  try {
    const requestBody = (await req.json()) as GenerateNotesRequest;
    note_id = requestBody.note_id;
    user_id = requestBody.user_id;
    const topic = requestBody.topic;

    if (!note_id || !user_id) {
      return new Response(JSON.stringify({ error: "note_id and user_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🚀 Generating UP Police GK RAW content for:", note_id, "Topic:", topic || "General");

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update progress - Starting
    console.log("📊 Progress: 10% - Starting generation");
    await supabase
      .from("study_notes")
      .update({
        processing_status: "generating",
        processing_progress: 10,
      })
      .eq("id", note_id);

    // Simplified system prompt for RAW content generation (not structured JSON)
    const systemPrompt = `You are an expert UP Police Constable 2026 exam preparation specialist.

Generate comprehensive study material for UP Police General Knowledge exam.

**Cover these key topics:**
1. Indian History (Ancient, Medieval, Modern, Freedom Struggle)
2. Indian Geography (Physical, Climate, Agriculture, Resources)
3. Indian Polity & Constitution (Fundamental Rights, Government Structure, Amendments)
4. Indian Economy (Planning, Banking, Budget, Government Schemes)
5. General Science (Physics, Chemistry, Biology, Environment)
6. Current Affairs (Last 6 months - National/International events, Awards, Sports)
7. Uttar Pradesh State GK (History, Geography, Culture, Administration, UP Police)
8. Computer Awareness (Basics, Software, Internet, Cyber Security, Digital India)

**Content Guidelines:**
- Provide comprehensive, exam-focused content with specific facts, dates, and numbers
- Include memory hooks, mnemonics, and shortcut techniques
- Add 15-20 practice MCQs with detailed explanations
- Focus on high-weightage topics (Current Affairs 20%, Polity 15%, History 15%)
- Emphasize UP State GK (10-15% weightage)
- Use markdown formatting (headings, bold, lists, tables)
- Keep paragraphs short (max 4 lines)

Return detailed markdown-formatted study material (NOT JSON). This raw content will be processed into structured notes.`;

    const topicContext = topic
      ? `Focus specifically on: ${topic}`
      : "Provide comprehensive General Knowledge coverage for UP Police exam";

    const userPrompt = `Generate comprehensive UP Police Constable 2026 General Knowledge study material.

${topicContext}

Include:
- All major GK topics relevant to UP Police exam
- Current affairs from last 6 months
- UP State GK (10-15% weightage)
- 15-20 practice MCQs with explanations
- Memory hooks and mnemonics
- Quick revision points

Create detailed, exam-focused markdown content.`;

    // Update progress - Preparing AI generation
    console.log("📊 Progress: 30% - Preparing AI generation");
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 30,
      })
      .eq("id", note_id);

    // Call AI to generate RAW content (markdown text, not JSON)
    console.log("🤖 Calling AI for UP Police GK RAW content generation...");
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 10000,
      responseFormat: "text", // Text format, not JSON
    });

    console.log("✅ AI generation complete - Content length:", aiResponse.content.length);

    logAIUsage("generate-uppolice-gk-notes", aiResponse.tokensUsed, aiResponse.webSearchUsed, aiResponse.modelUsed);

    console.log(
      "✅ AI RAW content generation complete with",
      aiResponse.modelUsed,
      "- Length:",
      aiResponse.content.length,
    );

    // Store raw content and mark as extracting (will be completed by generate-notes-summary)
    console.log("📊 Progress: 50% - Storing raw content and triggering summarization");
    await supabase
      .from("study_notes")
      .update({
        raw_content: aiResponse.content,
        processing_status: "extracting", // Will be completed by generate-notes-summary
        processing_progress: 50,
      })
      .eq("id", note_id);

    // Step 2: Trigger generate-notes-summary (same pattern as PDF/YouTube/DOCX)
    console.log("📝 Triggering summarization for UP Police GK notes...");
    console.log("📊 Progress: 60% - Starting summarization (will be handled by generate-notes-summary)");

    try {
      const summaryResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-notes-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          note_id,
          raw_content: aiResponse.content,
          language: "en",
        }),
      });

      if (!summaryResponse.ok) {
        const errorText = await summaryResponse.text();
        console.error("❌ Summarization error:", errorText);
        throw new Error(`Summarization failed: ${errorText}`);
      }

      const summaryData = await summaryResponse.json();
      console.log("✅ Summarization triggered successfully:", summaryData);
    } catch (summaryError: unknown) {
      console.error("Failed to trigger summarization:", summaryError);
      const errorMessage = summaryError instanceof Error ? summaryError.message : "Unknown error";
      // Update note with error
      await supabase
        .from("study_notes")
        .update({
          processing_status: "failed",
          processing_error: `Summarization failed: ${errorMessage}`,
        })
        .eq("id", note_id);

      throw summaryError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        raw_content_length: aiResponse.content.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("❌ Error in generate-uppolice-gk-notes:", error);
    const errorMessage = error instanceof Error ? error.message : "UP Police GK notes generation failed";

    if (note_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("study_notes")
          .update({
            processing_status: "failed",
            processing_error: errorMessage,
          })
          .eq("id", note_id);
      } catch (e) {
        console.error("Failed to update error status:", e);
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// ✅ NEW: JSON Repair Functions
// ============================================================

/**
 * Repair incomplete JSON by detecting common truncation patterns
 */
function repairIncompleteJSON(json: string): string {
  let repaired = json.trim();

  // Remove trailing commas in arrays/objects
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");

  // Check if JSON ends properly
  if (!repaired.endsWith("}") && !repaired.endsWith("]")) {
    console.log("🔧 Attempting to close incomplete JSON...");

    // Count unclosed braces
    const openBraces = (repaired.match(/{/g) || []).length;
    const closeBraces = (repaired.match(/}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/]/g) || []).length;

    console.log(`📊 Braces: ${openBraces} open, ${closeBraces} close`);
    console.log(`📊 Brackets: ${openBrackets} open, ${closeBrackets} close`);

    // Close unclosed arrays first (practice_questions is usually last)
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += "]";
    }

    // Close unclosed objects
    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += "}";
    }

    console.log("✅ Added closing brackets/braces");
  }

  return repaired;
}

/**
 * Aggressive JSON repair - removes incomplete sections
 */
function aggressiveJSONRepair(json: string): string {
  console.log("🔨 Attempting aggressive JSON repair...");

  let repaired = json.trim();

  // Strategy 1: Remove everything after last complete object/array
  const lastCompleteObject = repaired.lastIndexOf("}");
  const lastCompleteArray = repaired.lastIndexOf("]");
  const lastComplete = Math.max(lastCompleteObject, lastCompleteArray);

  if (lastComplete > 0) {
    // Check if there's garbage after this point
    const afterLast = repaired.substring(lastComplete + 1).trim();
    if (afterLast.length > 0 && !afterLast.match(/^[}\]]*$/)) {
      console.log("🗑️ Removing incomplete trailing content");
      repaired = repaired.substring(0, lastComplete + 1);
    }
  }

  // Strategy 2: If still broken, try to extract just the core fields
  try {
    JSON.parse(repaired);
    return repaired;
  } catch (e) {
    console.log("🔍 Trying to extract core fields only...");

    // Try to extract title, summary, key_points, sections
    const titleMatch = repaired.match(/"title"\s*:\s*"([^"]*)"/);
    const summaryMatch = repaired.match(/"summary"\s*:\s*"([^"]*)"/);

    // Find key_points array
    const keyPointsMatch = repaired.match(/"key_points"\s*:\s*\[([\s\S]*?)\](?=\s*,\s*"sections")/);

    // Find sections array (up to last valid closing)
    const sectionsStart = repaired.indexOf('"sections"');
    let sectionsContent = "";

    if (sectionsStart > 0) {
      const afterSections = repaired.substring(sectionsStart);
      // Find the sections array
      const arrayStart = afterSections.indexOf("[");
      if (arrayStart > 0) {
        let depth = 0;
        let endPos = arrayStart;
        for (let i = arrayStart; i < afterSections.length; i++) {
          if (afterSections[i] === "[") depth++;
          if (afterSections[i] === "]") {
            depth--;
            if (depth === 0) {
              endPos = i;
              break;
            }
          }
        }
        if (depth === 0) {
          sectionsContent = afterSections.substring(arrayStart, endPos + 1);
        }
      }
    }

    // Reconstruct minimal valid JSON
    const minimalJSON = {
      title: titleMatch ? titleMatch[1] : "UP Police GK Notes",
      summary: summaryMatch ? summaryMatch[1] : "Comprehensive notes for UP Police exam",
      key_points: keyPointsMatch ? JSON.parse(`[${keyPointsMatch[1]}]`) : [],
      sections: sectionsContent ? JSON.parse(sectionsContent) : [],
      practice_questions: [],
    };

    console.log("✅ Extracted minimal valid structure");
    return JSON.stringify(minimalJSON);
  }
}
