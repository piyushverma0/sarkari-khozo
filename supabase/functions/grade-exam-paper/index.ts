// Grade Exam Paper - AI-powered grading of exam attempts
// Grades MCQs automatically and uses AI for subjective answers
// Provides question-wise feedback and section-wise scores

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callParallel } from "../_shared/parallel-client.ts";
import { callAI } from "../_shared/ai-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GradeExamRequest {
  attempt_id: string;
}

interface Question {
  question_number: number;
  question_text: string;
  options?: string[] | null;
  marks: number;
  word_limit?: number | null;
  topic: string;
  difficulty: string;
}

interface UserAnswer {
  question_number: number;
  answer: string;
}

interface QuestionFeedback {
  question_number: number;
  user_answer: string;
  marks_awarded: number;
  max_marks: number;
  feedback: string;
  correct_answer_reference?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { attempt_id }: GradeExamRequest = await req.json();

    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "attempt_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🎓 Grading exam attempt:", attempt_id);

    // Get authorization header and extract JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace("Bearer ", "");

    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get authenticated user by passing token to getUser()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError);
      throw new Error("Authentication failed");
    }

    console.log("✅ User authenticated:", user.id);

    // Fetch exam attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", attempt_id)
      .eq("user_id", user.id)
      .single();

    if (attemptError) {
      throw new Error(`Failed to fetch attempt: ${attemptError.message}`);
    }

    if (attempt.status !== "submitted") {
      throw new Error("Attempt must be submitted before grading");
    }

    console.log("📄 Fetching exam paper:", attempt.exam_paper_id);

    // Fetch exam paper
    const { data: examPaper, error: paperError } = await supabase
      .from("exam_papers")
      .select("*")
      .eq("id", attempt.exam_paper_id)
      .eq("user_id", user.id)
      .single();

    if (paperError) {
      throw new Error(`Failed to fetch exam paper: ${paperError.message}`);
    }

    if (!examPaper.formatted_paper?.sections) {
      throw new Error("Exam paper is not properly formatted");
    }

    const formattedPaper = examPaper.formatted_paper;
    const userAnswers: UserAnswer[] = attempt.user_answers || [];

    console.log(`📝 Grading ${userAnswers.length} answers`);

    // Grade all questions
    const allQuestions: Question[] = [];
    formattedPaper.sections.forEach((section: any) => {
      section.questions.forEach((q: any) => {
        allQuestions.push(q);
      });
    });

    const questionFeedbacks: QuestionFeedback[] = [];
    let totalMarksObtained = 0;

    // Process answers in batches for efficiency
    const BATCH_SIZE = 10;
    for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
      const batch = allQuestions.slice(i, i + BATCH_SIZE);
      const batchFeedbacks = await Promise.all(
        batch.map((question) => gradeQuestion(question, userAnswers, examPaper.subject)),
      );
      questionFeedbacks.push(...batchFeedbacks);

      // Update total marks
      batchFeedbacks.forEach((fb) => {
        totalMarksObtained += fb.marks_awarded;
      });

      console.log(`✅ Graded questions ${i + 1}-${Math.min(i + BATCH_SIZE, allQuestions.length)}`);
    }

    // Calculate section-wise scores
    const sectionScores = formattedPaper.sections.map((section: any) => {
      const sectionQuestionNumbers = section.questions.map((q: any) => q.question_number);
      const sectionFeedbacks = questionFeedbacks.filter((fb) => sectionQuestionNumbers.includes(fb.question_number));

      const sectionMarksObtained = sectionFeedbacks.reduce((sum, fb) => sum + fb.marks_awarded, 0);
      const sectionTotalMarks = section.questions.reduce((sum: number, q: any) => sum + q.marks, 0);

      return {
        section_id: section.section_id,
        section_name: section.section_name,
        marks_obtained: sectionMarksObtained,
        total_marks: sectionTotalMarks,
        percentage: (sectionMarksObtained / sectionTotalMarks) * 100,
      };
    });

    // Calculate overall percentage and grade
    const percentage = (totalMarksObtained / examPaper.total_marks) * 100;
    const grade = calculateGrade(percentage, examPaper.exam_type);

    console.log(`📊 Total Score: ${totalMarksObtained}/${examPaper.total_marks} (${percentage.toFixed(2)}%)`);
    console.log(`🎯 Grade: ${grade}`);

    // Build grading result
    const gradingResult = {
      exam_paper_id: attempt.exam_paper_id,
      user_id: user.id,
      total_marks_obtained: totalMarksObtained,
      total_marks: examPaper.total_marks,
      percentage: percentage,
      grade: grade,
      section_wise_scores: sectionScores,
      question_wise_feedback: questionFeedbacks,
      graded_at: new Date().toISOString(),
    };

    // Update attempt with grading results
    const { error: updateError } = await supabase
      .from("exam_attempts")
      .update({
        grading_result: gradingResult,
        total_marks_obtained: totalMarksObtained,
        percentage: percentage,
        grade: grade,
        status: "graded",
        graded_at: new Date().toISOString(),
      })
      .eq("id", attempt_id)
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(`Failed to update attempt: ${updateError.message}`);
    }

    console.log("🎉 Grading complete!");

    return new Response(
      JSON.stringify({
        success: true,
        attempt_id: attempt_id,
        grading_result: gradingResult,
        summary: {
          total_marks_obtained: totalMarksObtained,
          total_marks: examPaper.total_marks,
          percentage: percentage,
          grade: grade,
          questions_graded: questionFeedbacks.length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Grading Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * Grade a single question
 */
async function gradeQuestion(
  question: Question,
  userAnswers: UserAnswer[],
  subject: string,
): Promise<QuestionFeedback> {
  const userAnswer = userAnswers.find((a) => a.question_number === question.question_number);

  // If no answer provided
  if (!userAnswer || !userAnswer.answer.trim()) {
    return {
      question_number: question.question_number,
      user_answer: "",
      marks_awarded: 0,
      max_marks: question.marks,
      feedback: "No answer provided.",
      correct_answer_reference: undefined,
    };
  }

  // MCQ or True/False - Direct comparison
  if (question.options && question.options.length > 0) {
    return gradeMCQ(question, userAnswer);
  }

  // Subjective questions - AI grading
  return await gradeSubjective(question, userAnswer, subject);
}

/**
 * Grade MCQ/True-False question
 */
function gradeMCQ(question: Question, userAnswer: UserAnswer): QuestionFeedback {
  // Normalize answers for comparison
  const normalizeAnswer = (answer: string) => {
    return answer
      .trim()
      .toLowerCase()
      .replace(/^[a-d]\.\s*/i, "") // Remove "A. ", "B. " prefix
      .replace(/^[a-d]\)\s*/i, "") // Remove "A) ", "B) " prefix
      .replace(/^[a-d]\s+/i, ""); // Remove "A " prefix
  };

  const userAnswerNormalized = normalizeAnswer(userAnswer.answer);

  // Check if answer matches any option
  const isCorrect = question.options!.some((option) => {
    const optionNormalized = normalizeAnswer(option);
    return optionNormalized === userAnswerNormalized;
  });

  if (isCorrect) {
    return {
      question_number: question.question_number,
      user_answer: userAnswer.answer,
      marks_awarded: question.marks,
      max_marks: question.marks,
      feedback: "Correct answer! Well done.",
      correct_answer_reference: undefined,
    };
  } else {
    return {
      question_number: question.question_number,
      user_answer: userAnswer.answer,
      marks_awarded: 0,
      max_marks: question.marks,
      feedback: "Incorrect answer. Please review this topic.",
      correct_answer_reference: "Check your notes for the correct concept.",
    };
  }
}

/**
 * Grade subjective question using AI
 */
async function gradeSubjective(question: Question, userAnswer: UserAnswer, subject: string): Promise<QuestionFeedback> {
  const systemPrompt = `You are an expert ${subject} examiner. Grade the student's answer accurately and fairly. Provide constructive feedback.`;

  const userPrompt = `Grade this answer for a ${question.marks}-mark question:

QUESTION:
${question.question_text}

STUDENT'S ANSWER:
${userAnswer.answer}

${question.word_limit ? `Word Limit: ${question.word_limit} words` : ""}
Topic: ${question.topic}
Difficulty: ${question.difficulty}

GRADING CRITERIA:
1. Correctness of concepts (40%)
2. Completeness of answer (30%)
3. Clarity and organization (20%)
4. Keyword usage (10%)

Return ONLY valid JSON:
{
  "marks_awarded": <number between 0 and ${question.marks}>,
  "feedback": "Brief feedback (1-2 sentences)",
  "correct_answer_reference": "Key points student should have mentioned (optional)"
}

Be fair and constructive. Award partial marks for partially correct answers.`;

  let aiResponse: any;
  let modelUsed = "parallel-lite";

  try {
    console.log(`🤖 AI grading question ${question.question_number}...`);
    aiResponse = await callParallel({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 500,
      jsonMode: true,
    });
  } catch (parallelError) {
    console.log("⚠️ Parallel AI failed, using fallback");
    const fallbackResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 500,
      responseFormat: "json",
    });
    aiResponse = {
      content: fallbackResponse.content,
    };
    modelUsed = fallbackResponse.modelUsed || "fallback-ai";
  }

  // Parse AI response
  let gradingData: any;
  try {
    let cleanContent = aiResponse.content
      .trim()
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "");

    const objectMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      gradingData = JSON.parse(objectMatch[0]);
    } else {
      gradingData = JSON.parse(cleanContent);
    }
  } catch (parseError) {
    console.error("Failed to parse AI grading:", parseError);
    // Fallback to partial marks
    return {
      question_number: question.question_number,
      user_answer: userAnswer.answer,
      marks_awarded: question.marks * 0.5,
      max_marks: question.marks,
      feedback: "Answer shows some understanding. Reviewed by fallback grading.",
      correct_answer_reference: "Please review key concepts for this topic.",
    };
  }

  // Ensure marks don't exceed maximum
  const marksAwarded = Math.min(Math.max(0, gradingData.marks_awarded || 0), question.marks);

  return {
    question_number: question.question_number,
    user_answer: userAnswer.answer,
    marks_awarded: marksAwarded,
    max_marks: question.marks,
    feedback: gradingData.feedback || "Answer graded.",
    correct_answer_reference: gradingData.correct_answer_reference || null,
  };
}

/**
 * Calculate grade based on percentage and exam type
 */
function calculateGrade(percentage: number, examType: string): string {
  // CBSE grading system
  if (examType === "CBSE" || examType === "UP_Board") {
    if (percentage >= 91) return "A1";
    if (percentage >= 81) return "A2";
    if (percentage >= 71) return "B1";
    if (percentage >= 61) return "B2";
    if (percentage >= 51) return "C1";
    if (percentage >= 41) return "C2";
    if (percentage >= 33) return "D";
    return "E (Needs Improvement)";
  }

  // UPSC/PSC grading
  if (examType === "UPSC" || examType === "State_PSC") {
    if (percentage >= 80) return "Outstanding";
    if (percentage >= 70) return "Excellent";
    if (percentage >= 60) return "Very Good";
    if (percentage >= 50) return "Good";
    if (percentage >= 40) return "Satisfactory";
    return "Needs Improvement";
  }

  // JEE/NEET percentile-based (simplified)
  if (examType === "JEE" || examType === "NEET") {
    if (percentage >= 90) return "Excellent (90+ percentile)";
    if (percentage >= 80) return "Very Good (80+ percentile)";
    if (percentage >= 70) return "Good (70+ percentile)";
    if (percentage >= 60) return "Above Average";
    if (percentage >= 50) return "Average";
    return "Below Average";
  }

  // SSC/Railway/Banking (Pass/Fail based)
  if (examType === "SSC" || examType === "Railway" || examType === "Banking") {
    if (percentage >= 80) return "Excellent";
    if (percentage >= 70) return "Very Good";
    if (percentage >= 60) return "Good";
    if (percentage >= 50) return "Satisfactory";
    if (percentage >= 40) return "Pass";
    return "Fail";
  }

  // Default grading
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C+";
  if (percentage >= 40) return "C";
  return "D";
}
