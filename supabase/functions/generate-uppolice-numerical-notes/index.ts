// Generate UP Police Numerical & Mental Ability Notes - AI-powered exam-focused content generation
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
    const { note_id: noteIdFromBody, user_id: userIdFromBody, topic }: GenerateNotesRequest = await req.json();

    note_id = noteIdFromBody;
    user_id = userIdFromBody;

    if (!note_id || !user_id) {
      return new Response(JSON.stringify({ error: "note_id and user_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating UP Police Numerical RAW content for:", note_id, "Topic:", topic || "General");

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_status: "generating",
        processing_progress: 10,
      })
      .eq("id", note_id);

    // Simplified system prompt for RAW content generation (not structured JSON)
    const systemPrompt = `You are an expert UP Police Constable 2026 exam preparation specialist.

Generate comprehensive study material for UP Police Numerical & Mental Ability exam.

**Cover these key topics:**
1. Arithmetic (Number Systems, Percentages, Profit Loss) (Ancient, Medieval, Modern, Freedom Struggle)
2. Indian Geography (Physical, Climate, Agriculture, Resources)
3. Indian Polity & Constitution (Fundamental Rights, Government Structure, Amendments)
4. Indian Economy (Planning, Banking, Budget, Government Schemes)
5. General Science (Physics, Chemistry, Biology, Environment)
6. Current Affairs (Last 6 months - National/International events, Awards, Sports)
7. Uttar Pradesh State Numerical (History, Geography, Culture, Administration, UP Police)
8. Computer Awareness (Basics, Software, Internet, Cyber Security, Digital India)

**Content Guidelines:**
- Provide comprehensive, exam-focused content with specific facts, dates, and numbers
- Include memory hooks, mnemonics, and shortcut techniques
- Add 15-20 practice MCQs with detailed explanations
- Focus on high-weightage topics (Current Affairs 20%, Polity 15%, History 15%)
- Emphasize UP State Numerical (10-15% weightage)
- Use markdown formatting (headings, bold, lists, tables)
- Keep paragraphs short (max 4 lines)

Return detailed markdown-formatted study material (NOT JSON). This raw content will be processed into structured notes.`;

    const topicContext = topic
      ? `Focus specifically on: ${topic}`
      : "Provide comprehensive Numerical & Mental Ability coverage for UP Police exam";

    const userPrompt = `Generate comprehensive UP Police Constable 2026 Numerical & Mental Ability study material.

${topicContext}

Include:
- All major Numerical topics relevant to UP Police exam
- Current affairs from last 6 months
- UP State Numerical (10-15% weightage)
- 15-20 practice MCQs with explanations
- Memory hooks and mnemonics
- Quick revision points

Create detailed, exam-focused markdown content.`;

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 30,
      })
      .eq("id", note_id);

    // Call AI to generate RAW content (markdown text, not JSON)
    console.log("Calling AI for UP Police Numerical RAW content generation...");
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 10000,
      responseFormat: "text", // Text format, not JSON
    });

    logAIUsage(
      "generate-uppolice-numerical-notes",
      aiResponse.tokensUsed,
      aiResponse.webSearchUsed,
      aiResponse.modelUsed,
    );

    console.log(
      "AI RAW content generation complete with",
      aiResponse.modelUsed,
      "- Length:",
      aiResponse.content.length,
    );

    // Store raw content and mark as extracting (will be completed by generate-notes-summary)
    await supabase
      .from("study_notes")
      .update({
        raw_content: aiResponse.content,
        processing_status: "extracting", // Will be completed by generate-notes-summary
        processing_progress: 50,
      })
      .eq("id", note_id);

    // Step 2: Trigger generate-notes-summary (same pattern as PDF/YouTube/DOCX)
    console.log("📝 Triggering summarization for UP Police Numerical notes...");

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
        console.error("Summarization error:", errorText);
        throw new Error(`Summarization failed: ${errorText}`);
      }

      const summaryData = await summaryResponse.json();
      console.log("Summarization triggered successfully:", summaryData);
    } catch (summaryError: unknown) {
      console.error("Failed to trigger summarization:", summaryError);
      const errorMessage = summaryError instanceof Error ? summaryError.message : "Unknown summarization error";
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
    console.error("Error in generate-uppolice-numerical-notes:", error);
    const errorMessage = error instanceof Error ? error.message : "UP Police Numerical notes generation failed";

    // Update note status to failed (use note_id from outer scope)
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
