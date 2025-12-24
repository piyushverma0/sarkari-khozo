// Generate Exam Paper - Phase 3 of Mock Test Generation
// Formats complete exam paper with headers, instructions, and final validation
// Produces print-ready exam paper matching official format

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FormatPaperRequest {
  exam_paper_id: string;
}

// Exam board full names and codes
const EXAM_BOARD_INFO = {
  CBSE: {
    name: "Central Board of Secondary Education",
    session: "2024-25 - Annual Examination",
  },
  UPSC: {
    name: "Union Public Service Commission",
    session: "Civil Services Examination - 2025",
  },
  SSC: {
    name: "Staff Selection Commission",
    session: "Combined Graduate Level Examination - 2025",
  },
  Railway: {
    name: "Railway Recruitment Board",
    session: "Railway Recruitment Examination - 2025",
  },
  JEE: {
    name: "Joint Entrance Examination",
    session: "JEE (Main) - 2025",
  },
  NEET: {
    name: "National Eligibility cum Entrance Test",
    session: "NEET (UG) - 2025",
  },
  Banking: {
    name: "Banking Recruitment Examination",
    session: "IBPS/SBI - 2025",
  },
  UP_Board: {
    name: "Uttar Pradesh Madhyamik Shiksha Parishad",
    session: "Board Examination - 2024-25",
  },
  State_PSC: {
    name: "State Public Service Commission",
    session: "State Civil Services Examination - 2025",
  },
};

// Subject codes (common ones)
const SUBJECT_CODES: { [key: string]: string } = {
  Chemistry: "043",
  Physics: "042",
  Mathematics: "041",
  Biology: "044",
  English: "101",
  Hindi: "002",
  History: "027",
  Geography: "029",
  "Political Science": "028",
  Economics: "030",
  "General Science": "GS",
  "General Awareness": "GA",
  Reasoning: "R",
  "Quantitative Aptitude": "QA",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { exam_paper_id }: FormatPaperRequest = await req.json();

    if (!exam_paper_id) {
      return new Response(JSON.stringify({ error: "exam_paper_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("📝 Phase 3: Formatting Complete Exam Paper");
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

    // Fetch exam paper
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

    // Check if Phase 2 is complete
    if (!examPaper.formatted_paper?.sections || examPaper.current_phase < 2) {
      throw new Error("Phase 2 (questions) must be completed first");
    }

    const outline = examPaper.exam_outline;
    const partialPaper = examPaper.formatted_paper;

    console.log("📄 Formatting paper with", partialPaper.sections.length, "sections");

    // Get board info
    const boardInfo = EXAM_BOARD_INFO[examPaper.exam_type as keyof typeof EXAM_BOARD_INFO] || {
      name: examPaper.exam_type,
      session: "Examination - 2025",
    };

    // Get subject code
    const subjectCode = SUBJECT_CODES[examPaper.subject] || "XXX";

    // Format header
    const formattedHeader = {
      board_name: boardInfo.name,
      session: boardInfo.session,
      subject_code: `${examPaper.subject} (${subjectCode})`,
      class: examPaper.class_level || null,
      duration: formatDuration(examPaper.duration_minutes),
      max_marks: examPaper.total_marks.toString(),
    };

    console.log("✅ Header formatted:", formattedHeader.board_name);

    // Format general instructions
    const generalInstructions = formatGeneralInstructions(
      examPaper.exam_type,
      outline.exam_metadata?.instructions || [],
    );

    console.log("✅ Instructions formatted:", generalInstructions.length, "items");

    // Validate paper
    console.log("🔍 Validating exam paper...");
    const validation = validateExamPaper(partialPaper.sections, examPaper.total_marks, outline.sections);

    if (!validation.isValid) {
      console.error("❌ Validation failed:", validation.errors);
      throw new Error(`Exam paper validation failed: ${validation.errors.join(", ")}`);
    }

    console.log("✅ Validation passed");

    // Build complete formatted paper
    const completePaper = {
      exam_id: exam_paper_id,
      formatted_header: formattedHeader,
      instructions: generalInstructions,
      sections: partialPaper.sections,
      total_questions: partialPaper.total_questions,
      generated_at: new Date().toISOString(),
      validation: {
        total_marks_check: validation.totalMarks,
        expected_marks: examPaper.total_marks,
        questions_validated: validation.questionCount,
        sections_validated: validation.sectionCount,
      },
    };

    // Update database - mark as ready
    const { error: updateError } = await supabase
      .from("exam_papers")
      .update({
        formatted_paper: completePaper,
        current_phase: 3,
        generation_status: "ready",
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", exam_paper_id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update exam paper:", updateError);
      throw updateError;
    }

    console.log("🎉 Phase 3 Complete: Exam Paper Ready!");
    console.log(`📊 Total Questions: ${completePaper.total_questions}`);
    console.log(`📊 Total Marks: ${validation.totalMarks}/${examPaper.total_marks}`);
    console.log(`📊 Sections: ${completePaper.sections.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        exam_paper_id,
        phase: 3,
        status: "ready",
        paper: {
          total_questions: completePaper.total_questions,
          total_marks: examPaper.total_marks,
          duration: formattedHeader.duration,
          sections: completePaper.sections.map((s: any) => ({
            section_id: s.section_id,
            section_name: s.section_name,
            question_count: s.questions.length,
          })),
        },
        validation: completePaper.validation,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("❌ Phase 3 Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Update exam paper status to failed
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          global: { headers: { Authorization: authHeader } },
        });

        const body = await req.json();
        if (body.exam_paper_id) {
          await supabase
            .from("exam_papers")
            .update({
              generation_status: "failed",
              error_message: errorMessage,
            })
            .eq("id", body.exam_paper_id);
        }
      }
    } catch (e) {
      console.error("Failed to update error status:", e);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        phase: 3,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/**
 * Format duration from minutes to readable string
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} Minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} Hour${hours > 1 ? "s" : ""}`;
  }

  return `${hours} Hour${hours > 1 ? "s" : ""} ${remainingMinutes} Minutes`;
}

/**
 * Format general instructions based on exam type
 */
function formatGeneralInstructions(examType: string, customInstructions: string[]): string[] {
  const baseInstructions = [
    "Read all instructions carefully before attempting the questions.",
    "All questions are compulsory unless stated otherwise.",
    "Write your answers neatly and legibly.",
    "Marks are indicated against each question.",
  ];

  // Exam-specific instructions
  const examSpecificInstructions: { [key: string]: string[] } = {
    CBSE: [
      "Draw diagrams wherever necessary.",
      "Use of calculators is not permitted.",
      "Check that all pages of the question paper are complete.",
    ],
    UPSC: [
      "Answers must be written in the medium authorized in the Admission Certificate.",
      "The number of words indicated is approximate.",
      "Credit will be given for orderly, effective and exact expression combined with due economy of words.",
    ],
    SSC: [
      "There is negative marking for wrong answers.",
      "Each wrong answer will result in deduction of 0.25 marks.",
      "Do not use pencil for marking answers on OMR sheet.",
    ],
    Railway: [
      "There is negative marking of 1/3 marks for each wrong answer.",
      "Mark your answers carefully on the OMR sheet.",
      "Use only blue/black ball point pen.",
    ],
    JEE: [
      "For each question, you will be awarded 4 marks if you darken the bubble(s) corresponding to the correct answer(s) only.",
      "In case of negative marking questions, -1 mark will be awarded for incorrect answer.",
      "No deduction from the total score will be made if no answer is indicated.",
    ],
    NEET: [
      "Each question carries 4 marks.",
      "For each incorrect response, 1 mark will be deducted from the total score.",
      "No mark will be deducted for un-attempted questions.",
    ],
  };

  const specificInstructions = examSpecificInstructions[examType] || [];

  // Merge custom instructions
  const allInstructions = [
    ...baseInstructions,
    ...specificInstructions,
    ...customInstructions.filter((inst) => !baseInstructions.includes(inst) && !specificInstructions.includes(inst)),
  ];

  return allInstructions.slice(0, 10); // Limit to 10 instructions
}

/**
 * Validate exam paper for correctness
 */
function validateExamPaper(
  sections: any[],
  expectedTotalMarks: number,
  outlineSections: any[],
): {
  isValid: boolean;
  errors: string[];
  totalMarks: number;
  questionCount: number;
  sectionCount: number;
} {
  const errors: string[] = [];
  let totalMarks = 0;
  let questionCount = 0;

  // Check sections exist
  if (!sections || sections.length === 0) {
    errors.push("No sections found in paper");
    return { isValid: false, errors, totalMarks: 0, questionCount: 0, sectionCount: 0 };
  }

  // Validate each section
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const outlineSection = outlineSections[i];

    if (!section.questions || !Array.isArray(section.questions)) {
      errors.push(`Section ${section.section_id}: No questions found`);
      continue;
    }

    // Count questions and marks
    const sectionQuestions = section.questions.length;
    const sectionMarks = section.questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);

    questionCount += sectionQuestions;
    totalMarks += sectionMarks;

    // Validate question count matches outline
    if (outlineSection && sectionQuestions !== outlineSection.total_questions) {
      console.warn(
        `Section ${section.section_id}: Question count mismatch (got ${sectionQuestions}, expected ${outlineSection.total_questions})`,
      );
    }

    // Validate marks match outline
    if (outlineSection && Math.abs(sectionMarks - outlineSection.total_marks) > 2) {
      console.warn(
        `Section ${section.section_id}: Marks mismatch (got ${sectionMarks}, expected ${outlineSection.total_marks})`,
      );
    }

    // Check sequential numbering
    for (let j = 0; j < section.questions.length; j++) {
      const question = section.questions[j];
      if (!question.question_text || question.question_text.trim() === "") {
        errors.push(`Section ${section.section_id}, Question ${j + 1}: Empty question text`);
      }
    }
  }

  // Check total marks (allow 10% variance for optional questions)
  const marksVariance = Math.abs(totalMarks - expectedTotalMarks);
  const allowedVariance = expectedTotalMarks * 0.1;

  if (marksVariance > allowedVariance) {
    errors.push(`Total marks mismatch: got ${totalMarks}, expected ${expectedTotalMarks} (variance: ${marksVariance})`);
  }

  // Check minimum questions
  if (questionCount < 5) {
    errors.push(`Too few questions: ${questionCount}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    totalMarks,
    questionCount,
    sectionCount: sections.length,
  };
}
