// Generate Quiz - Create AI-powered quizzes from study notes
// Supports MCQ, True/False, Short Answer, and Mixed types
// Uses Sonar Pro with GPT-4-turbo fallback for intelligent question generation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callAI, logAIUsage } from "../_shared/ai-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuizRequest {
  note_id: string;
  user_id: string;
  quiz_type: "mcq" | "true_false" | "short_answer" | "mixed";
  question_count: number;
  time_limit_minutes?: number;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      note_id,
      user_id,
      quiz_type,
      question_count = 10,
      time_limit_minutes,
      difficulty = "mixed",
    }: QuizRequest = await req.json();

    if (!note_id || !user_id || !quiz_type) {
      return new Response(JSON.stringify({ error: "note_id, user_id, and quiz_type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating quiz for note:", note_id, "Type:", quiz_type, "Questions:", question_count);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch note content
    const { data: note, error: fetchError } = await supabase
      .from("study_notes")
      .select("title, structured_content")
      .eq("id", note_id)
      .eq("user_id", user_id)
      .single();

    if (fetchError) {
      console.error("Database error fetching note:", fetchError);
      throw new Error(`Failed to fetch note: ${fetchError.message}`);
    }

    if (!note) {
      throw new Error("Note not found");
    }

    console.log("Note fetched:", note.title);

    // Check if note has content
    if (!note.structured_content) {
      throw new Error("Note has no content. Please ensure the note has been fully processed before generating a quiz.");
    }

    // Build quiz generation prompt from structured content
    const contentForPrompt = JSON.stringify(note.structured_content, null, 2);

    const quizTypeInstructions = {
      mcq: "Multiple Choice Questions with 4 options (A, B, C, D). Mark correct answer.",
      true_false: "True/False questions. Mark correct answer.",
      short_answer: "Short answer questions requiring 1-2 sentence responses.",
      mixed: "Mix of MCQ (60%), True/False (20%), and Short Answer (20%).",
    };

    const systemPrompt =
      "You are an expert exam creator for Indian government exams. Always return valid JSON without markdown.";

    const userPrompt = `Generate a high-quality quiz with ${question_count} questions from the following study notes.

QUIZ TYPE: ${quiz_type.toUpperCase().replace("_", " ")}
${quizTypeInstructions[quiz_type]}

DIFFICULTY: ${difficulty === "mixed" ? "Mix of easy (30%), medium (50%), hard (20%)" : difficulty}

QUESTION CREATION RULES:
1. Questions must be:
   - Clear and unambiguous
   - Testing understanding and application
   - Exam-relevant and practical
   - Based strictly on the provided content
   - At appropriate difficulty level
2. For MCQ:
   - Create plausible distractors
   - Avoid "all of the above" or "none of the above" unless necessary
   - Make options similar in length
3. For True/False:
   - Test important concepts
   - Avoid trick questions
4. For Short Answer:
   - Require concise 1-2 sentence responses
   - Test key concepts and understanding
5. Include explanations for all answers
6. Cover diverse topics from the content

STUDY NOTES:
Title: ${note.title}
Content:
${contentForPrompt.substring(0, 15000)}

OUTPUT FORMAT: Return ONLY valid JSON (no markdown):
{
  "quiz_title": "Quiz title based on content",
  "total_questions": ${question_count},
  "passing_score": 60,
  "questions": [
    {
      "question": "Question text",
      "type": "mcq" | "true_false" | "short_answer",
      "options": ["A", "B", "C", "D"] (for MCQ/True-False only, null for short answer),
      "correct_answer": "Correct answer",
      "explanation": "Why this is correct"
    }
  ]
}

Generate exactly ${question_count} questions. Return ONLY the JSON.`;

    // Call Gemini API
    console.log("Calling AI (Sonar Pro → GPT-4-turbo) for quiz generation...");
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 6000,
      responseFormat: "json",
    });

    logAIUsage("generate-quiz", aiResponse.tokensUsed, aiResponse.webSearchUsed, aiResponse.modelUsed);

    console.log("AI quiz generation complete");

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
    let quizData;
    try {
      quizData = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      console.error("Response text:", responseText.substring(0, 500));
      throw new Error(`Failed to parse quiz: ${parseError.message}`);
    }

    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error("Invalid quiz format");
    }

    console.log("Generated", quizData.questions.length, "questions");

    // Add id and points to each question to match Kotlin model
    const questionsWithIds = quizData.questions.map((question: any) => ({
      id: crypto.randomUUID(),
      question: question.question,
      type: question.type,
      options: question.options || null,
      correct_answer: question.correct_answer,
      explanation: question.explanation || null,
      points: 1,
    }));

    // Create quiz record
    const { data: quiz, error: quizError } = await supabase
      .from("note_quizzes")
      .insert({
        note_id,
        user_id,
        title: quizData.quiz_title || `${note.title} - Quiz`,
        description: `${quiz_type.toUpperCase()} quiz with ${questionsWithIds.length} questions`,
        quiz_type,
        passing_score: quizData.passing_score || 60,
        time_limit_minutes,
        show_answers_immediately: true,
        questions: questionsWithIds,
      })
      .select()
      .single();

    if (quizError) {
      console.error("Failed to create quiz:", quizError);
      throw quizError;
    }

    console.log("Quiz created:", quiz.id);

    // Update note to mark quiz as generated
    await supabase.from("study_notes").update({ has_quiz: true }).eq("id", note_id);

    return new Response(
      JSON.stringify({
        success: true,
        quiz_id: quiz.id,
        note_id,
        quiz_title: quiz.title,
        total_questions: questionsWithIds.length,
        quiz,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in generate-quiz:", error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
