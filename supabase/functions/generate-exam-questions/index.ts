// Generate Exam Questions - Phase 2 of Mock Test Generation
// Generates actual questions section by section based on outline from Phase 1
// Uses past year patterns and maintains exam authenticity

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

interface GenerateQuestionsRequest {
  exam_paper_id: string;
}

interface Section {
  section_id: string;
  section_name: string;
  question_type: string;
  total_questions: number;
  marks_per_question: number;
  total_marks: number;
  has_choices?: boolean;
  word_limit?: number | null;
  topics: string[];
}

interface Question {
  question_number: number;
  question_text: string;
  options?: string[] | null;
  marks: number;
  word_limit?: number | null;
  topic: string;
  difficulty: string;
  past_year_reference?: string | null;
  sub_questions?: any[] | null; // For multi-part questions
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { exam_paper_id }: GenerateQuestionsRequest = await req.json();

    if (!exam_paper_id) {
      return new Response(JSON.stringify({ error: "exam_paper_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("📝 Phase 2: Generating Exam Questions");
    console.log("Exam Paper ID:", exam_paper_id);

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

    // Fetch exam paper with outline
    const { data: examPaper, error: fetchError } = await supabase
      .from("exam_papers")
      .select("*")
      .eq("id", exam_paper_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      console.error("Failed to fetch exam paper:", fetchError);
      throw new Error(`Failed to fetch exam paper: ${fetchError.message}`);
    }

    if (!examPaper) {
      throw new Error("Exam paper not found");
    }

    // Check if Phase 1 is complete
    if (!examPaper.exam_outline || examPaper.current_phase < 1) {
      throw new Error("Phase 1 (outline) must be completed first");
    }

    const outline = examPaper.exam_outline;
    const sections: Section[] = outline.sections || [];

    if (sections.length === 0) {
      throw new Error("No sections found in exam outline");
    }

    console.log(`📚 Generating questions for ${sections.length} sections`);

    // Fetch note content if available for personalization
    let noteContent = "";
    if (examPaper.note_id) {
      const { data: note } = await supabase
        .from("study_notes")
        .select("title, summary, key_points, raw_content, structured_content")
        .eq("id", examPaper.note_id)
        .eq("user_id", user.id)
        .single();

      if (note) {
        noteContent = `
Context from study notes:
Title: ${note.title}
Summary: ${note.summary || "N/A"}
Key Points: ${Array.isArray(note.key_points) ? note.key_points.join("\n") : "N/A"}
Content: ${note.raw_content?.substring(0, 3000) || JSON.stringify(note.structured_content)?.substring(0, 3000) || "N/A"}
`.trim();
        console.log("📚 Using personalized content from note:", note.title);
      }
    }

    // Generate questions for all sections sequentially
    const allSectionsWithQuestions: any[] = [];
    let currentQuestionNumber = 1;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      console.log(`\n🔄 Generating Section ${section.section_id}: ${section.section_name}`);
      console.log(`   Type: ${section.question_type}, Questions: ${section.total_questions}`);

      const sectionQuestions = await generateSectionQuestions(
        section,
        currentQuestionNumber,
        examPaper.exam_type,
        examPaper.subject,
        examPaper.class_level,
        noteContent,
      );

      // Update question numbers
      const numberedQuestions = sectionQuestions.map((q, idx) => ({
        ...q,
        question_number: currentQuestionNumber + idx,
      }));

      allSectionsWithQuestions.push({
        section_id: section.section_id,
        section_name: section.section_name,
        section_instructions: getSectionInstructions(section),
        questions: numberedQuestions,
      });

      currentQuestionNumber += numberedQuestions.length;
      console.log(`✅ Section ${section.section_id} complete: ${numberedQuestions.length} questions generated`);
    }

    const totalQuestions = currentQuestionNumber - 1;
    console.log(`\n🎉 All questions generated: ${totalQuestions} total questions`);

    // Update exam paper with questions
    const formattedPaper = {
      exam_id: exam_paper_id,
      sections: allSectionsWithQuestions,
      total_questions: totalQuestions,
      generated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("exam_papers")
      .update({
        formatted_paper: formattedPaper,
        current_phase: 2,
        updated_at: new Date().toISOString(),
      })
      .eq("id", exam_paper_id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update exam paper:", updateError);
      throw updateError;
    }

    console.log("✅ Phase 2 Complete: Questions Saved to Database");

    return new Response(
      JSON.stringify({
        success: true,
        exam_paper_id,
        phase: 2,
        total_questions: totalQuestions,
        sections_count: allSectionsWithQuestions.length,
        sections: allSectionsWithQuestions.map((s) => ({
          section_id: s.section_id,
          section_name: s.section_name,
          question_count: s.questions.length,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Phase 2 Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        phase: 2,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * Generate questions for a specific section
 */
async function generateSectionQuestions(
  section: Section,
  startingQuestionNumber: number,
  examType: string,
  subject: string,
  classLevel: string | null,
  noteContent: string,
): Promise<Question[]> {
  const questionType = section.question_type;
  const questionCount = section.total_questions;
  const marksPerQuestion = section.marks_per_question;
  const topics = section.topics || [];
  const wordLimit = section.word_limit;

  console.log("🤖 Calling AI for section question generation...");

  // Build system prompt based on question type
  const systemPrompt = getSystemPromptForQuestionType(questionType, examType);

  // Build user prompt
  const userPrompt = `Generate ${questionCount} ${questionType} questions for ${examType} ${subject} exam.

SECTION DETAILS:
- Section: ${section.section_name}
- Question Type: ${questionType}
- Total Questions: ${questionCount}
- Marks per Question: ${marksPerQuestion}
${wordLimit ? `- Word Limit: ${wordLimit} words` : ""}
- Topics: ${topics.join(", ")}
${classLevel ? `- Class/Level: ${classLevel}` : ""}

${noteContent ? `\nPERSONALIZED CONTENT:\n${noteContent}\n` : ""}

REQUIREMENTS:
1. Questions must match ${examType} past year paper patterns
2. Cover all topics: ${topics.join(", ")}
3. Difficulty distribution: 30% easy, 50% medium, 20% hard
4. Questions should be clear, unambiguous, and exam-authentic
5. ${getQuestionTypeSpecificRequirements(questionType)}

${getQuestionFormat(questionType, marksPerQuestion, wordLimit)}

Generate EXACTLY ${questionCount} questions. Return ONLY valid JSON array.`;

  let aiResponse: any;
  let modelUsed = "parallel-lite";

  // Try Parallel AI first
  try {
    console.log("🔵 Trying Parallel AI for section questions...");
    aiResponse = await callParallel({
      systemPrompt,
      userPrompt,
      enableWebSearch: true, // Search for past papers
      temperature: 0.5,
      maxTokens: 15000,
      jsonMode: true,
    });
    console.log("✅ Parallel AI succeeded");
  } catch (parallelError) {
    console.log("⚠️ Parallel AI failed, using fallback:", parallelError.message);

    const fallbackResponse = await callAI({
      systemPrompt,
      userPrompt,
      enableWebSearch: true,
      temperature: 0.5,
      maxTokens: 15000,
      responseFormat: "json",
    });

    aiResponse = {
      content: fallbackResponse.content,
      tokensUsed: fallbackResponse.tokensUsed,
    };
    modelUsed = fallbackResponse.modelUsed || "fallback-ai";
    console.log(`✅ Fallback AI succeeded: ${modelUsed}`);
  }

  // Parse questions with multi-stage parsing
  let questions: Question[];
  try {
    let cleanContent = aiResponse.content.trim();

    // Step 1: Remove markdown code blocks
    const jsonBlockMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      cleanContent = jsonBlockMatch[1].trim();
      console.log("✅ Removed markdown code block");
    } else {
      cleanContent = cleanContent
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "")
        .trim();
    }

    // Step 2: Handle multiple levels of escaped JSON strings
    let unescapeAttempts = 0;
    const MAX_UNESCAPE_ATTEMPTS = 5;

    while (
      unescapeAttempts < MAX_UNESCAPE_ATTEMPTS &&
      typeof cleanContent === "string" &&
      cleanContent.startsWith('"') &&
      cleanContent.endsWith('"')
    ) {
      try {
        const unescaped = JSON.parse(cleanContent);
        if (typeof unescaped === "string") {
          cleanContent = unescaped;
          unescapeAttempts++;
          console.log(`✅ Unescaped JSON string wrapper (attempt ${unescapeAttempts})`);
        } else {
          cleanContent = unescaped;
          console.log(`✅ Parsed JSON after ${unescapeAttempts + 1} unescape attempts`);
          break;
        }
      } catch (e) {
        console.warn(`⚠️ Failed to unescape at attempt ${unescapeAttempts + 1}`);
        break;
      }
    }

    // Step 2.5: Repair common JSON malformations
    if (typeof cleanContent === "string") {
      // Remove stray quote marks that appear alone on lines (common AI error)
      cleanContent = cleanContent.replace(/"\s*\n\s*"/g, '"');
      // Remove quote marks that appear alone between JSON elements
      cleanContent = cleanContent.replace(/"\s*"\s*,/g, '",');
      cleanContent = cleanContent.replace(/"\s*"\s*}/g, '"}');
      cleanContent = cleanContent.replace(/"\s*"\s*]/g, '"]');
      // Fix double quotes at end of strings
      cleanContent = cleanContent.replace(/""\s*,/g, '",');
      cleanContent = cleanContent.replace(/""\s*}/g, '"}');
      console.log("✅ Applied JSON malformation repairs");
    }

    // Step 3: If we have an array already, use it. Otherwise extract and parse
    if (Array.isArray(cleanContent)) {
      questions = cleanContent;
    } else {
      // Extract JSON array using smart bracket counting
      // Find the first [ and the matching closing ]
      const firstBracket = cleanContent.indexOf("[");

      if (firstBracket === -1) {
        // Step 3.5: Fallback - check if this is a plain text numbered list
        console.log("⚠️ No JSON array found, checking for plain text numbered list format...");

        // Pattern: "1. Question text (difficulty)" or "1. Question text"
        const numberedListPattern = /^\d+\.\s+(.+?)(?:\s*\((\w+)\))?(?:\n|$)/gm;
        const matches = Array.from(cleanContent.matchAll(numberedListPattern));

        if (matches.length > 0) {
          console.log(`✅ Found ${matches.length} numbered list items, converting to JSON...`);

          questions = matches.map((match, idx) => {
            const questionText = match[1].trim();
            const difficulty = match[2]?.toLowerCase() || "medium";

            // For MCQ questions, try to extract options
            let options = null;
            if (questionType === "MCQ" || questionType === "MULTI_SELECT") {
              // Look for options in the lines following this question
              const questionStart = match.index!;
              const nextQuestionMatch = matches[idx + 1];
              const questionEnd = nextQuestionMatch ? nextQuestionMatch.index! : cleanContent.length;
              const questionBlock = cleanContent.substring(questionStart, questionEnd);

              // Try to find options (A), (B), (C), (D) or A. B. C. D.
              const optionPattern = /[A-D][\)\.]\s*(.+?)(?=\n[A-D][\)\.]|\n\d+\.|\n\n|$)/gs;
              const optionMatches = Array.from(questionBlock.matchAll(optionPattern));

              if (optionMatches.length >= 2) {
                options = optionMatches.map((opt) => opt[1].trim());
                console.log(`  ✅ Extracted ${options.length} options for question ${idx + 1}`);
              }
            }

            return {
              question_text: questionText,
              options: options,
              difficulty: difficulty,
              topic: topics[idx % topics.length] || "General",
            };
          });

          console.log(`✅ Successfully converted ${questions.length} plain text items to JSON`);
        } else {
          console.error("❌ No JSON array or numbered list found in response");
          throw new Error("No JSON array found in response");
        }
      } else {
        // Found JSON array bracket, extract it
        // Find the matching closing bracket by counting brackets
        let bracketCount = 0;
        let inString = false;
        let escapeNext = false;
        let lastBracket = -1;

        for (let i = firstBracket; i < cleanContent.length; i++) {
          const char = cleanContent[i];

          if (escapeNext) {
            escapeNext = false;
            continue;
          }

          if (char === "\\") {
            escapeNext = true;
            continue;
          }

          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === "[") {
              bracketCount++;
            } else if (char === "]") {
              bracketCount--;
              if (bracketCount === 0) {
                lastBracket = i;
                break;
              }
            }
          }
        }

        if (lastBracket === -1) {
          console.error("❌ Could not find matching closing bracket");
          console.error("❌ Content preview:", cleanContent.substring(0, 500));
          throw new Error("Incomplete JSON array in response");
        }

        const jsonStr = cleanContent.substring(firstBracket, lastBracket + 1);
        console.log(`✅ Extracted JSON array (${jsonStr.length} chars)`);
        questions = JSON.parse(jsonStr);
      }
    }

    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array");
    }

    console.log(`✅ Parsed ${questions.length} questions (expected ${questionCount})`);

    // Validate count
    if (questions.length !== questionCount) {
      console.warn(`⚠️ Question count mismatch: got ${questions.length}, expected ${questionCount}`);
      // Trim or pad as needed
      if (questions.length > questionCount) {
        questions = questions.slice(0, questionCount);
      }
    }
  } catch (parseError) {
    console.error("❌ Failed to parse questions from Parallel AI:", parseError);
    console.error("Response preview:", aiResponse.content.substring(0, 500));
    console.log("🔄 Retrying with ai-client.ts fallback...");

    // Fallback to ai-client.ts
    try {
      const fallbackResponse = await callAI({
        systemPrompt,
        userPrompt,
        enableWebSearch: true,
        temperature: 0.5,
        maxTokens: 15000,
        responseFormat: "json",
      });

      console.log(`✅ ai-client.ts fallback succeeded (model: ${fallbackResponse.modelUsed})`);

      // Parse the fallback response
      let fallbackContent = fallbackResponse.content.trim();

      // Apply same parsing logic
      const jsonBlockMatch = fallbackContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        fallbackContent = jsonBlockMatch[1].trim();
      }

      // Try to parse as JSON
      try {
        questions = JSON.parse(fallbackContent);
      } catch {
        // Try to extract JSON array
        const bracketStart = fallbackContent.indexOf("[");
        const bracketEnd = fallbackContent.lastIndexOf("]");
        if (bracketStart !== -1 && bracketEnd !== -1) {
          const jsonStr = fallbackContent.substring(bracketStart, bracketEnd + 1);
          questions = JSON.parse(jsonStr);
        } else {
          throw new Error("Could not extract valid JSON from fallback response");
        }
      }

      if (!Array.isArray(questions)) {
        throw new Error("Fallback response is not an array");
      }

      console.log(`✅ Parsed ${questions.length} questions from fallback (expected ${questionCount})`);
    } catch (fallbackError) {
      console.error("❌ ai-client.ts fallback also failed:", fallbackError);
      throw new Error(`All AI providers failed to generate questions: ${fallbackError.message}`);
    }
  }

  // Validate and enrich questions
  questions = questions.map((q, idx) => ({
    question_number: startingQuestionNumber + idx,
    question_text: q.question_text || q.question || "",
    options: q.options || null,
    marks: marksPerQuestion,
    word_limit: wordLimit || null,
    topic: q.topic || topics[idx % topics.length] || "General",
    difficulty: q.difficulty || "medium",
    past_year_reference: q.past_year_reference || null,
    sub_questions: q.sub_questions || null,
  }));

  return questions;
}

/**
 * Get system prompt based on question type
 */
function getSystemPromptForQuestionType(questionType: string, examType: string): string {
  const basePrompt = `You are an expert ${examType} exam question creator. Generate questions that match real past year papers exactly.`;

  switch (questionType) {
    case "MCQ":
      return `${basePrompt} Create multiple choice questions with 4 options (A, B, C, D). Make distractors plausible but clearly wrong. Always return valid JSON.`;

    case "TRUE_FALSE":
      return `${basePrompt} Create true/false questions testing important concepts. Avoid trick questions. Always return valid JSON.`;

    case "SHORT_ANSWER":
      return `${basePrompt} Create short answer questions requiring 2-3 sentence responses. Focus on conceptual understanding. Always return valid JSON.`;

    case "LONG_ANSWER":
      return `${basePrompt} Create long answer questions requiring detailed explanations. Test deep understanding. Always return valid JSON.`;

    case "CASE_STUDY":
      return `${basePrompt} Create case study based questions with context and multiple sub-questions. Always return valid JSON.`;

    case "FILL_BLANK":
      return `${basePrompt} Create fill in the blank questions with specific, unambiguous answers. Always return valid JSON.`;

    case "MATCH_FOLLOWING":
      return `${basePrompt} Create match the following questions with two columns. Always return valid JSON.`;

    default:
      return `${basePrompt} Create high-quality exam questions. Always return valid JSON.`;
  }
}

/**
 * Get question type specific requirements
 */
function getQuestionTypeSpecificRequirements(questionType: string): string {
  switch (questionType) {
    case "MCQ":
      return 'For MCQ: Create 4 plausible options, avoid "all of the above" unless necessary, make options similar in length';

    case "SHORT_ANSWER":
      return "For Short Answer: Questions should require concise 2-3 sentence responses testing key concepts";

    case "LONG_ANSWER":
      return "For Long Answer: Questions should require detailed explanations, diagrams, examples";

    case "CASE_STUDY":
      return "For Case Study: Provide context paragraph followed by 3-5 sub-questions";

    default:
      return "Follow standard exam question format";
  }
}

/**
 * Get JSON output format for question type
 */
function getQuestionFormat(questionType: string, marks: number, wordLimit: number | null): string {
  const baseFormat = `
OUTPUT FORMAT (return ONLY this JSON array):
[
  {
    "question_text": "Question here",
    ${questionType === "MCQ" ? '"options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],' : ""}
    ${questionType === "TRUE_FALSE" ? '"options": ["True", "False"],' : ""}
    "topic": "Topic name from list",
    "difficulty": "easy" | "medium" | "hard",
    "past_year_reference": "${questionType} format seen in 2023 paper" (optional)
    ${questionType === "CASE_STUDY" ? ',\n    "sub_questions": [{"question": "...", "marks": 2}, ...]' : ""}
  }
]`;

  return baseFormat;
}

/**
 * Get section-specific instructions
 */
function getSectionInstructions(section: Section): string {
  const instructions: string[] = [];

  // Question count and marks
  instructions.push(
    `This section contains ${section.total_questions} questions of ${section.marks_per_question} mark(s) each.`,
  );

  // Total marks
  instructions.push(`Total marks for this section: ${section.total_marks}`);

  // Choices
  if (section.has_choices) {
    instructions.push("Answer any questions as per choice given.");
  } else {
    instructions.push("All questions are compulsory.");
  }

  // Word limit
  if (section.word_limit) {
    instructions.push(`Word limit: ${section.word_limit} words`);
  }

  // Question type specific
  switch (section.question_type) {
    case "MCQ":
      instructions.push("Choose the correct option for each question.");
      break;
    case "SHORT_ANSWER":
      instructions.push("Write short answers in 2-3 sentences.");
      break;
    case "LONG_ANSWER":
      instructions.push("Write detailed answers with diagrams wherever necessary.");
      break;
    case "CASE_STUDY":
      instructions.push("Read the case study carefully and answer all sub-questions.");
      break;
  }

  return instructions.join(" ");
}
