// Generate Exam Outline - Phase 1 of Mock Test Generation
// Analyzes exam requirements and creates detailed exam blueprint
// Supports CBSE, UPSC, SSC, Railway, JEE, NEET, Banking, and other competitive exams

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

interface GenerateOutlineRequest {
  note_id?: string; // Optional: Generate from specific note
  exam_type: string; // 'CBSE', 'UPSC', 'SSC', 'Railway', 'JEE', 'NEET', etc.
  subject: string;
  class_level?: string; // '10', '12', 'Graduate', etc. (optional for competitive exams)
  duration_minutes: number;
  total_marks: number;
}

// Exam type configurations for accurate formatting
const EXAM_FORMATS = {
  CBSE: {
    name: "Central Board of Secondary Education",
    format: "Sections A/B/C/D format with MCQ, Short Answer, Long Answer, Case Study",
    marking: "Negative marking typically not applicable except objective sections",
  },
  UPSC: {
    name: "Union Public Service Commission",
    format: "Mains format with word limits, optional questions, multi-part questions",
    marking: "Descriptive answers with strict word limits",
  },
  SSC: {
    name: "Staff Selection Commission",
    format: "Tier-based: Tier 1 (MCQ only), Tier 2 (Descriptive + MCQ)",
    marking: "Negative marking of 0.25 or 0.50 for wrong answers",
  },
  Railway: {
    name: "Railway Recruitment Board",
    format: "MCQ-based with multiple sections (GA, Reasoning, Math, Technical)",
    marking: "Negative marking of 1/3 marks for wrong answers",
  },
  JEE: {
    name: "Joint Entrance Examination",
    format: "MCQ (single correct, multiple correct), Numerical value, Integer type",
    marking: "Negative marking varies by question type",
  },
  NEET: {
    name: "National Eligibility cum Entrance Test",
    format: "MCQ only with 4 options each",
    marking: "Negative marking of 1 mark for wrong answers",
  },
  Banking: {
    name: "Banking Recruitment Exams (IBPS/SBI)",
    format: "Prelims (MCQ) and Mains (MCQ + Descriptive)",
    marking: "Negative marking of 0.25 marks",
  },
  UP_Board: {
    name: "Uttar Pradesh Board of Education",
    format: "Similar to CBSE with sections and various question types",
    marking: "No negative marking",
  },
  State_PSC: {
    name: "State Public Service Commission",
    format: "Prelims (MCQ) and Mains (Descriptive)",
    marking: "Negative marking in Prelims, no negative in Mains",
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { note_id, exam_type, subject, class_level, duration_minutes, total_marks }: GenerateOutlineRequest =
      await req.json();

    // Validation
    if (!exam_type || !subject || !duration_minutes || !total_marks) {
      return new Response(
        JSON.stringify({
          error: "exam_type, subject, duration_minutes, and total_marks are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("📝 Phase 1: Generating Exam Outline");
    console.log("Exam Type:", exam_type);
    console.log("Subject:", subject);
    console.log("Duration:", duration_minutes, "minutes");
    console.log("Total Marks:", total_marks);

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

    // Fetch note content if note_id provided
    let noteContent = "";
    let noteTitle = "";
    if (note_id) {
      const { data: note, error: fetchError } = await supabase
        .from("study_notes")
        .select("title, summary, key_points, raw_content, structured_content")
        .eq("id", note_id)
        .eq("user_id", user.id)
        .single();

      if (fetchError) {
        console.error("Failed to fetch note:", fetchError);
        throw new Error(`Failed to fetch note: ${fetchError.message}`);
      }

      if (note) {
        noteTitle = note.title;
        noteContent = `
Based on your study notes:
Title: ${note.title}

Summary: ${note.summary || "N/A"}

Key Points: ${Array.isArray(note.key_points) ? note.key_points.join("\n") : "N/A"}

Content Preview: ${note.raw_content?.substring(0, 5000) || note.structured_content ? JSON.stringify(note.structured_content).substring(0, 5000) : "N/A"}
`.trim();
        console.log("📚 Loaded note:", note.title);
      }
    }

    // Get exam format details
    const examFormat = EXAM_FORMATS[exam_type as keyof typeof EXAM_FORMATS] || {
      name: exam_type,
      format: "Standard exam format",
      marking: "As per exam guidelines",
    };

    console.log("🤖 Calling AI for exam outline generation...");

    // Build AI prompts
    const systemPrompt = `You are an expert exam paper creator specializing in ${examFormat.name} examinations. You have deep knowledge of:
- Official ${exam_type} exam patterns and formats from past 10 years
- Question distribution and section-wise breakdown
- Marking schemes and time allocation
- Topic weightage and difficulty distribution
- Standard instructions and exam rules

You create exam outlines that EXACTLY match real ${exam_type} exam papers. Always return valid JSON without markdown.`;

    const userPrompt = `Create a detailed exam outline for a ${exam_type} ${subject} exam with these specifications:

EXAM SPECIFICATIONS:
- Exam Type: ${exam_type} (${examFormat.name})
- Subject: ${subject}
${class_level ? `- Class/Level: ${class_level}` : ""}
- Duration: ${duration_minutes} minutes
- Total Marks: ${total_marks}

${noteContent ? `\nPERSONALIZATION:\n${noteContent}\n\nGenerate questions based on this content while maintaining ${exam_type} exam format.\n` : ""}

TASK:
Analyze past ${exam_type} ${subject} exam papers and create an outline that follows the EXACT format.

REQUIREMENTS:
1. Section Distribution:
   - Divide marks appropriately across sections (e.g., MCQ, Short Answer, Long Answer, Case Study)
   - Follow ${exam_type} standard section naming (A, B, C, D or Part I, II, III)
   - Ensure total marks add up to ${total_marks}

2. Question Types:
   - Use question types typical for ${exam_type}: ${examFormat.format}
   - Specify marks per question clearly
   - Add word limits for descriptive questions

3. Topic Distribution:
   - Cover major topics from ${subject} syllabus
   - Assign appropriate marks to each topic
   - Balance easy/medium/hard difficulty

4. Instructions:
   - Include general instructions typical for ${exam_type}
   - Add section-specific instructions
   - Mention marking scheme (${examFormat.marking})

OUTPUT FORMAT: Return ONLY valid JSON (no markdown, no explanations):
{
  "exam_metadata": {
    "exam_type": "${exam_type}",
    "exam_name": "${examFormat.name}",
    "subject": "${subject}",
    "class": "${class_level || ""}",
    "duration_minutes": ${duration_minutes},
    "total_marks": ${total_marks},
    "instructions": [
      "All questions are compulsory",
      "Read instructions carefully",
      "Write answers in neat handwriting",
      "Draw diagrams wherever necessary"
    ]
  },
  "sections": [
    {
      "section_id": "A",
      "section_name": "Multiple Choice Questions",
      "question_type": "MCQ",
      "total_questions": 20,
      "marks_per_question": 1,
      "total_marks": 20,
      "has_choices": true,
      "word_limit": null,
      "topics": ["Topic 1", "Topic 2", "Topic 3"]
    },
    {
      "section_id": "B",
      "section_name": "Short Answer Questions",
      "question_type": "SHORT_ANSWER",
      "total_questions": 10,
      "marks_per_question": 2,
      "total_marks": 20,
      "has_choices": false,
      "word_limit": 50,
      "topics": ["Topic 1", "Topic 2"]
    }
  ],
  "topic_distribution": {
    "Topic 1": 30,
    "Topic 2": 25,
    "Topic 3": 25,
    "Topic 4": 20
  }
}

Generate the complete exam outline now.`;

    let aiResponse: any;
    let modelUsed = "parallel-lite";

    // Try Parallel AI first
    try {
      console.log("🔵 Trying Parallel AI...");
      aiResponse = await callParallel({
        systemPrompt,
        userPrompt,
        enableWebSearch: true, // Search for past papers
        temperature: 0.3,
        maxTokens: 3000,
        jsonMode: true,
      });
      console.log("✅ Parallel AI succeeded");
    } catch (parallelError) {
      console.log("⚠️ Parallel AI failed, falling back to ai-client:", parallelError.message);

      const fallbackResponse = await callAI({
        systemPrompt,
        userPrompt,
        enableWebSearch: true,
        temperature: 0.3,
        maxTokens: 3000,
        responseFormat: "json",
      });

      aiResponse = {
        content: fallbackResponse.content,
        tokensUsed: fallbackResponse.tokensUsed,
      };
      modelUsed = fallbackResponse.modelUsed || "fallback-ai";
      console.log(`✅ Fallback AI succeeded with model: ${modelUsed}`);
    }

    console.log(`🎯 AI response complete (${modelUsed})`);

    // Parse AI response with multi-stage parsing
    let outline: any;
    try {
      let cleanContent = aiResponse.content.trim();

      // Step 1: Remove markdown code blocks if present
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
      // AI sometimes returns JSON wrapped in quotes multiple times
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
            // Successfully got an object
            cleanContent = unescaped;
            console.log(`✅ Parsed JSON object after ${unescapeAttempts + 1} unescape attempts`);
            break;
          }
        } catch (e) {
          console.warn(`⚠️ Failed to unescape at attempt ${unescapeAttempts + 1}, trying extraction`);
          break;
        }
      }

      // Step 3: If we have an object already, use it. Otherwise extract and parse
      if (typeof cleanContent === "object" && cleanContent !== null) {
        outline = cleanContent;
      } else {
        // Extract JSON object using improved regex
        // Find the first { and the matching closing }
        const firstBrace = cleanContent.indexOf("{");

        if (firstBrace === -1) {
          throw new Error("No JSON object found in response");
        }

        // Find the matching closing brace by counting braces
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        let lastBrace = -1;

        for (let i = firstBrace; i < cleanContent.length; i++) {
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
            if (char === "{") {
              braceCount++;
            } else if (char === "}") {
              braceCount--;
              if (braceCount === 0) {
                lastBrace = i;
                break;
              }
            }
          }
        }

        if (lastBrace === -1) {
          console.error("❌ Could not find matching closing brace");
          console.error("❌ Content preview:", cleanContent.substring(0, 500));
          throw new Error("Incomplete JSON object in response");
        }

        const jsonStr = cleanContent.substring(firstBrace, lastBrace + 1);
        console.log(`✅ Extracted JSON object (${jsonStr.length} chars)`);
        outline = JSON.parse(jsonStr);
      }

      // Step 4: Validate structure
      if (!outline.exam_metadata || !Array.isArray(outline.sections)) {
        throw new Error("Invalid outline structure: missing exam_metadata or sections");
      }

      console.log(`✅ Successfully parsed outline with ${outline.sections.length} sections`);
    } catch (parseError) {
      console.error("❌ Failed to parse JSON:", parseError);
      console.error("❌ Response preview:", aiResponse.content.substring(0, 500));
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // Validate sections
    let totalMarksSum = 0;
    for (const section of outline.sections) {
      if (!section.section_id || !section.section_name || !section.question_type) {
        throw new Error(`Invalid section: missing required fields`);
      }
      totalMarksSum += section.total_marks || 0;
    }

    // Check if total marks match (allow 10% variance for choices/optional questions)
    if (Math.abs(totalMarksSum - total_marks) > total_marks * 0.1) {
      console.warn(`⚠️ Total marks mismatch: expected ${total_marks}, got ${totalMarksSum}`);
    }

    console.log("✅ Outline validated successfully");

    // Create exam_paper record in database
    const { data: examPaper, error: insertError } = await supabase
      .from("exam_papers")
      .insert({
        user_id: user.id,
        note_id: note_id || null,
        exam_type,
        subject,
        class_level: class_level || null,
        duration_minutes,
        total_marks,
        exam_outline: outline,
        formatted_paper: {}, // Empty until Phase 3
        generation_status: "generating",
        current_phase: 1,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create exam_paper:", insertError);
      throw insertError;
    }

    console.log("🎉 Exam paper created:", examPaper.id);
    console.log("✅ Phase 1 Complete: Exam Outline Generated");

    return new Response(
      JSON.stringify({
        success: true,
        exam_paper_id: examPaper.id,
        phase: 1,
        outline: outline,
        note_title: noteTitle || null,
        model_used: modelUsed,
        exam_paper: examPaper,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Phase 1 Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        phase: 1,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
