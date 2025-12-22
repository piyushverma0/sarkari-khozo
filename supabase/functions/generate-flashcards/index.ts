// Generate Flashcards - Create AI-powered flashcards from study notes
// Uses Sonar Pro with GPT-4-turbo fallback to generate high-quality Q&A pairs

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callAI, logAIUsage } from "../_shared/ai-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FlashcardRequest {
  note_id: string;
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { note_id, user_id }: FlashcardRequest = await req.json();

    if (!note_id || !user_id) {
      return new Response(JSON.stringify({ error: "note_id and user_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating flashcards for note:", note_id);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch note content
    const { data: note, error: fetchError } = await supabase
      .from("study_notes")
      .select("title, structured_content, raw_content")
      .eq("id", note_id)
      .single();

    if (fetchError || !note) {
      throw new Error("Note not found or incomplete");
    }

    console.log("Note fetched:", note.title);

    // Build flashcard generation prompt
    const contentForPrompt = note.structured_content
      ? JSON.stringify(note.structured_content, null, 2)
      : note.raw_content || "No content available";

    const systemPrompt =
      "You are an expert educator creating flashcards for exam preparation. Always return valid JSON.";

    const userPrompt = `Generate 15-20 high-quality flashcards from the following study notes.

FLASHCARD CREATION RULES:
1. Mix difficulty levels (30% easy, 50% medium, 20% hard)
2. Cover ALL key concepts comprehensively
3. Questions must be:
   - Clear and specific
   - Unambiguous
   - Testing understanding, not just memory
   - Exam-relevant
4. Answers should be:
   - Concise but complete
   - Accurate and factual
   - Easy to remember
5. Include helpful hints for harder questions
6. Categorize by topic for better organization
7. Focus on:
   - Key dates and deadlines
   - Eligibility criteria
   - Important numbers (fees, ages, vacancies)
   - Process steps
   - Important terms and definitions

STUDY NOTES:
Title: ${note.title}
Content:
${contentForPrompt.substring(0, 15000)}

OUTPUT FORMAT: Return ONLY valid JSON (no markdown):
{
  "flashcards": [
    {
      "question": "Clear, specific question?",
      "answer": "Concise, complete answer",
      "hint": "Helpful hint or mnemonic (optional)",
      "category": "Topic category",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

Generate ${Math.min(20, Math.max(10, Math.ceil(contentForPrompt.length / 500)))} flashcards. Return ONLY the JSON.`;

    // Call Gemini API
    console.log("Calling AI (Sonar Pro → GPT-4-turbo) for flashcard generation...");
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.5, // Slightly higher for creative question generation
      maxTokens: 4096,
      responseFormat: "json",
    });

    logAIUsage("generate-flashcards", aiResponse.tokensUsed, aiResponse.webSearchUsed, aiResponse.modelUsed);

    console.log("AI flashcard generation complete");

    // Extract response text
    let responseText = aiResponse.content;

    // Clean up response
    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Parse JSON
    let flashcardsData;
    try {
      flashcardsData = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      console.error("Response text:", responseText.substring(0, 500));
      throw new Error(`Failed to parse flashcards: ${parseError.message}`);
    }

    if (!flashcardsData.flashcards || !Array.isArray(flashcardsData.flashcards)) {
      throw new Error("Invalid flashcards format");
    }

    console.log("Generated", flashcardsData.flashcards.length, "flashcards");

    // Prepare flashcards for database insertion
    const flashcardsToInsert = flashcardsData.flashcards.map((fc: any) => ({
      note_id,
      user_id,
      question: fc.question,
      answer: fc.answer,
      hint: fc.hint || null,
      category: fc.category || "General",
      difficulty: fc.difficulty || "medium",
      ease_factor: 2.5, // Initial ease factor for SuperMemo SM-2
      interval: 0,
      repetitions: 0,
      next_review_date: null, // Due immediately
    }));

    // Insert flashcards into database
    const { data: insertedCards, error: insertError } = await supabase
      .from("note_flashcards")
      .insert(flashcardsToInsert)
      .select();

    if (insertError) {
      console.error("Failed to insert flashcards:", insertError);
      throw insertError;
    }

    console.log("Flashcards inserted into database:", insertedCards.length);

    // Update note to mark flashcards as generated
    await supabase.from("study_notes").update({ has_flashcards: true }).eq("id", note_id);

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        flashcards_count: insertedCards.length,
        flashcards: insertedCards,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in generate-flashcards:", error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
