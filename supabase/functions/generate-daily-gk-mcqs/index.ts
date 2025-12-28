// ============================================================
// Generate Daily General Knowledge MCQs
// ============================================================
// Creates 5 engaging MCQs per day using Parallel AI
// Caches results to avoid regenerating same day
// Used for home screen "General Knowledge" section
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callParallel, logParallelUsage } from "../_shared/parallel-client.ts";
import { callAI } from "../_shared/ai-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// Types
// ============================================================
interface MCQOption {
  A: string;
  B: string;
  C: string;
  D: string;
}

interface GKQuestion {
  id: string;
  question: string;
  options: MCQOption;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
}

interface MCQResponse {
  questions: GKQuestion[];
}

// ============================================================
// Main Handler
// ============================================================
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🎯 Generate Daily GK MCQs - Starting...");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`📅 Checking for MCQs on: ${today}`);

    // ========================================================
    // Check if MCQs already exist for today (caching)
    // ========================================================
    const { data: existing, error: fetchError } = await supabase
      .from("daily_gk_mcqs")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    if (existing && !fetchError) {
      console.log("✅ Using cached MCQs for today:", today);
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          date: today,
          mcqs: existing,
          questions: existing.questions,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ========================================================
    // Generate new MCQs using Parallel AI
    // ========================================================
    console.log("🤖 Generating new MCQs using Parallel AI...");

    const systemPrompt = `You are an expert at creating engaging general knowledge MCQs for Indian government exam aspirants.

EXPERTISE:
- Create questions that are interesting, educational, and exam-relevant
- Cover diverse topics: Indian history, geography, science, current affairs, culture, polity, economics
- Questions should be clear, unambiguous, and at appropriate difficulty level
- Always return valid JSON without markdown formatting

RESPONSE FORMAT:
Always return ONLY valid JSON (no markdown, no code blocks, no backticks)`;

    const userPrompt = `Generate 5 general knowledge multiple choice questions for today (${today}).

REQUIREMENTS:
1. Each question must have:
   - Clear and engaging question text
   - 4 options (A, B, C, D) - all plausible
   - One correct answer
   - Detailed explanation (2-3 sentences)

2. Topic Distribution (exactly 5 questions):
   - 1 question on Indian History/Culture
   - 1 question on Geography/Environment
   - 1 question on Science/Technology
   - 1 question on Current Affairs/Polity
   - 1 question on General Knowledge/Mixed

3. Difficulty Mix:
   - 2 Easy questions (basic facts, widely known)
   - 2 Medium questions (requires some knowledge)
   - 1 Hard question (competitive exam level)

4. Question Quality:
   - Make questions interesting and educational
   - Avoid trick questions
   - All options should be similar length
   - Explanation should teach something new
   - Relevant for Indian government exam preparation

OUTPUT FORMAT (return ONLY this JSON structure, no markdown):
{
  "questions": [
    {
      "id": "1",
      "question": "Question text here?",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correct_answer": "A",
      "explanation": "Detailed 2-3 sentence explanation why A is correct and what this teaches us."
    }
  ]
}

Generate exactly 5 diverse, high-quality questions. Return ONLY the JSON.`;

    // Try Parallel AI first, fallback to Perplexity if it fails
    let aiResponse: { content: string; tokensUsed: { total: number }; webSearchUsed: boolean };
    let usedParallel = false;

    try {
      console.log("🔵 Trying Parallel AI...");

      const parallelResponse = await callParallel({
        systemPrompt,
        userPrompt,
        maxTokens: 3000,
        temperature: 0.7,
        jsonMode: true,
      });

      if (!parallelResponse.content || parallelResponse.content.trim().length === 0) {
        throw new Error("Parallel AI returned empty response");
      }

      aiResponse = {
        content: parallelResponse.content,
        tokensUsed: { total: parallelResponse.tokensUsed.total },
        webSearchUsed: parallelResponse.webSearchUsed,
      };
      usedParallel = true;
      logParallelUsage("generate-daily-gk-mcqs", parallelResponse.tokensUsed, parallelResponse.webSearchUsed);
      console.log("✅ Using Parallel AI response");
    } catch (parallelError: unknown) {
      const errorMessage = parallelError instanceof Error ? parallelError.message : String(parallelError);
      console.warn("⚠️ Parallel AI failed:", errorMessage);
      console.log("🟣 Falling back to Perplexity AI...");

      const perplexityResponse = await callAI({
        systemPrompt,
        userPrompt,
        maxTokens: 3000,
        temperature: 0.7,
        responseFormat: "json",
      });

      aiResponse = {
        content: perplexityResponse.content,
        tokensUsed: { total: perplexityResponse.tokensUsed.input + perplexityResponse.tokensUsed.output },
        webSearchUsed: perplexityResponse.webSearchUsed,
      };
      usedParallel = false;
      console.log("✅ Using Perplexity AI response");
    }

    console.log("📦 Received AI response, parsing JSON...");
    console.log("📏 Response length:", aiResponse.content.length, "characters");
    console.log("🔍 Response preview:", aiResponse.content.substring(0, 200));

    // ========================================================
    // Parse and validate JSON response
    // ========================================================
    let cleanedJson = aiResponse.content.trim();

    // Remove markdown code blocks if present
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      console.log("🧹 Removed ```json markdown blocks");
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
      console.log("🧹 Removed ``` markdown blocks");
    }

    let mcqData: MCQResponse;
    try {
      let parsed = JSON.parse(cleanedJson);
      
      // Handle double-stringified JSON (AI sometimes returns JSON wrapped in a string)
      if (typeof parsed === "string") {
        console.log("🔄 Detected double-stringified JSON, parsing again...");
        parsed = JSON.parse(parsed);
      }
      
      // Handle case where AI returns array directly instead of { questions: [...] }
      if (Array.isArray(parsed)) {
        console.log("🔄 Detected array response, wrapping in questions object...");
        mcqData = { questions: parsed };
      } else {
        mcqData = parsed;
      }
      
      console.log("✅ JSON parsed successfully, type:", typeof mcqData, "has questions:", !!mcqData.questions);
    } catch (parseError: unknown) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      console.error("❌ Failed to parse JSON:", parseError);
      console.error("📄 Raw response (first 500 chars):", aiResponse.content.substring(0, 500));
      console.error("🧹 Cleaned JSON (first 500 chars):", cleanedJson.substring(0, 500));
      throw new Error(`Failed to parse MCQs: ${errorMessage}`);
    }

    // Validate structure
    if (!mcqData.questions || !Array.isArray(mcqData.questions)) {
      console.error("❌ Invalid structure. mcqData keys:", Object.keys(mcqData || {}));
      console.error("📄 mcqData preview:", JSON.stringify(mcqData).substring(0, 300));
      throw new Error("Invalid MCQ format: questions array missing");
    }

    if (mcqData.questions.length !== 5) {
      throw new Error(`Invalid MCQ count: expected 5, got ${mcqData.questions.length}`);
    }

    // Validate each question
    for (let i = 0; i < mcqData.questions.length; i++) {
      const q = mcqData.questions[i];
      if (!q.id || !q.question || !q.options || !q.correct_answer || !q.explanation) {
        throw new Error(`Question ${i + 1} is missing required fields`);
      }
      if (!["A", "B", "C", "D"].includes(q.correct_answer)) {
        throw new Error(`Question ${i + 1} has invalid correct_answer: ${q.correct_answer}`);
      }
    }

    console.log(`✅ Validated ${mcqData.questions.length} questions`);

    // ========================================================
    // Store in database
    // ========================================================
    const { data: savedMCQs, error: saveError } = await supabase
      .from("daily_gk_mcqs")
      .insert({
        date: today,
        questions: mcqData.questions,
      })
      .select()
      .single();

    if (saveError) {
      console.error("❌ Failed to save MCQs:", saveError);
      throw new Error(`Database error: ${saveError.message}`);
    }

    console.log("✅ Successfully generated and saved MCQs for:", today);
    console.log(
      "📊 Questions:",
      mcqData.questions.map((q, i) => `${i + 1}. ${q.question.substring(0, 50)}...`),
    );

    // ========================================================
    // Return success response
    // ========================================================
    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        date: today,
        mcqs: savedMCQs,
        questions: savedMCQs.questions,
        stats: {
          questions_count: mcqData.questions.length,
          tokens_used: aiResponse.tokensUsed.total,
          used_parallel: usedParallel,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    console.error("❌ Error in generate-daily-gk-mcqs:", error);

    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorDetails,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
