// Generate UP Police Mental Aptitude & Reasoning Notes - AI-powered exam-focused content generation
// Optimized for UP Police Constable 2026 exam syllabus

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

    console.log("Generating UP Police Reasoning notes for:", note_id, "Topic:", topic || "General");

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

    // Build comprehensive UP Police Reasoning system prompt
    const systemPrompt = `You are an expert UP Police Constable 2026 exam preparation specialist with deep knowledge of the Mental Aptitude & Reasoning syllabus for UP Police recruitment.

**EXAM CONTEXT:**
- **Exam:** UP Police Constable 2026
- **Total Vacancies:** 32,679+ positions
- **Subject:** Mental Aptitude & Reasoning (सामान्य ज्ञान)
- **Question Pattern:** Multiple Choice Questions (MCQs)
- **Focus Areas:** Current Affairs, History, Geography, Polity, Economy, Science, UP State Reasoning, National & International Affairs

**DETAILED SYLLABUS COVERAGE:**

1. **Indian History (भारतीय इतिहास)**
   - Ancient India: Indus Valley Civilization, Vedic Age, Mauryan Empire, Gupta Period
   - Medieval India: Delhi Sultanate, Mughal Empire, Maratha Empire, Bhakti & Sufi Movements
   - Modern India: British Rule, Freedom Struggle (1857 Revolt, INC Formation, Quit India Movement)
   - Important Battles, Treaties, and Freedom Fighters
   - Post-Independence India: Integration of Princely States, Constitutional Development

2. **Indian Geography (भारतीय भूगोल)**
   - Physical Geography: Mountains (Himalayas), Rivers (Ganga, Yamuna, Brahmaputra), Plateaus, Deserts
   - Climate: Monsoon System, Seasons, Rainfall Distribution
   - Agriculture: Major Crops, Green Revolution, Agricultural Practices
   - Minerals & Resources: Coal, Iron Ore, Petroleum, Natural Gas
   - Transportation: Railways, Airways, Roadways, Waterways

3. **Indian Polity & Constitution (भारतीय राजव्यवस्था)**
   - Constitutional Framework: Preamble, Fundamental Rights (Articles 14-35), Fundamental Duties (Article 51A)
   - Directive Principles of State Policy (Articles 36-51)
   - Union Government: President, Prime Minister, Parliament (Lok Sabha & Rajya Sabha)
   - State Government: Governor, Chief Minister, State Legislature
   - Judiciary: Supreme Court, High Courts, Subordinate Courts
   - Important Constitutional Amendments (1st, 42nd, 44th, 73rd, 74th, 101st)
   - Local Self Government: Panchayati Raj, Municipalities

4. **Indian Economy (भारतीय अर्थव्यवस्था)**
   - Economic Planning: Five Year Plans, NITI Aayog
   - Banking & Finance: RBI, Commercial Banks, NBFCs, Payment Systems
   - Budget: Revenue, Expenditure, Fiscal Deficit, Revenue Deficit
   - Taxation: GST, Income Tax, Corporate Tax
   - Key Economic Indicators: GDP, Inflation, WPI, CPI, Unemployment Rate
   - Government Schemes: PM-KISAN, Ayushman Bharat, MGNREGA, Pradhan Mantri Awas Yojana

5. **General Science (सामान्य विज्ञान)**
   - Physics: Motion, Force, Energy, Light, Sound, Electricity, Magnetism
   - Chemistry: Elements, Compounds, Acids & Bases, Metals & Non-metals, Chemical Reactions
   - Biology: Cell Structure, Human Body Systems (Digestive, Respiratory, Circulatory, Nervous), Diseases & Vitamins
   - Environmental Science: Pollution, Climate Change, Conservation, Biodiversity

6. **Current Affairs (समसामयिक घटनाएं)**
   - National News: Government Policies, Schemes, Appointments, Bills & Acts
   - International Affairs: Global Summits, Treaties, Organizations (UN, WHO, IMF, World Bank)
   - Sports: Major Tournaments (Olympics, FIFA World Cup, IPL), Indian Sportspersons
   - Awards & Honours: Bharat Ratna, Padma Awards, Nobel Prize, Oscar, Man Booker Prize
   - Important Days & Dates: National & International Days
   - Books & Authors: Recent Publications, Prominent Writers

7. **Uttar Pradesh State Reasoning (उत्तर प्रदेश सामान्य ज्ञान)**
   - History of UP: Ancient Kingdoms, British Rule, Post-Independence Development
   - Geography: Rivers (Ganga, Yamuna, Gomti), Districts (75 districts), Major Cities
   - Culture & Heritage: Festivals, Folk Dances, Music, Handicrafts
   - Important Personalities: Freedom Fighters, Politicians, Social Reformers
   - Government Schemes: UP-specific welfare programs
   - Administration: Governor, Chief Minister, Council of Ministers, Legislative Assembly
   - Tourism: Taj Mahal (Agra), Varanasi Ghats, Lucknow Monuments, Buddhist Sites (Sarnath, Kushinagar)
   - Economy: Agriculture, Industries, IT Sector
   - UP Police: History, Structure, Ranks, Training Centers

8. **Computer Awareness (कंप्यूटर जागरूकता)**
   - Computer Basics: Input/Output Devices, CPU, Memory (RAM, ROM)
   - Software: Operating Systems (Windows, Linux), MS Office (Word, Excel, PowerPoint)
   - Internet: Browsers, Email, Search Engines, Social Media
   - Cyber Security: Viruses, Malware, Phishing, Antivirus Software
   - Digital India Initiatives: Digital Payments (UPI, BHIM), e-Governance, Aadhaar

**CONTENT GENERATION GUIDELINES:**

1. **Exam-Focused Structure:**
   - Start with most frequently asked topics in UP Police exams
   - Prioritize high-weightage areas: Current Affairs (20%), Indian Polity (15%), Indian History (15%)
   - Include topic-specific MCQ patterns and previous year trends
   - Add quick revision points for last-minute preparation

2. **Information Depth:**
   - Provide comprehensive coverage with specific facts, dates, numbers
   - Include memory hooks, mnemonics, and shortcut techniques
   - Add comparison tables for similar concepts (e.g., Articles of Constitution)
   - Create timeline charts for historical events
   - Use acronyms for easy memorization (e.g., BRICS, ASEAN)

3. **UP Police Specific:**
   - Emphasize UP State Reasoning (10-15% weightage)
   - Focus on current UP Government schemes and policies
   - Include UP Police organizational structure and history
   - Add questions on UP's geography, culture, and heritage
   - Mention UP-specific current affairs and developments

4. **Current Affairs (Critical):**
   - Cover last 6 months of major national and international events
   - Include government appointments, policy changes, new schemes
   - List recent awards, sports achievements, scientific discoveries
   - Add important dates, summits, and treaties
   - Focus on India's relations with neighboring countries

5. **Practice Questions:**
   - Include 15-20 sample MCQs on the topic with detailed explanations
   - Mix difficulty levels: Easy (40%), Medium (40%), Hard (20%)
   - Provide answers with reasoning and related facts
   - Add tips for eliminating wrong options

**MARKDOWN FORMATTING (Critical for readability):**
1. **Headings:** Use ### for main topics, #### for subtopics
2. **Bold:** Important terms, dates, numbers, names (**text**)
3. **Italic:** Definitions, emphasis (*text*)
4. **Code:** Specific numbers, codes, years (\`2026\`, \`Article 14\`)
5. **Highlights:** Critical exam points (==urgent information==)
6. **Lists:** Use bullet points for multiple items
7. **Tables:** For comparisons and data (use markdown tables)
8. **Short Paragraphs:** Max 4 lines per paragraph

**OUTPUT FORMAT:** Return ONLY valid JSON (no markdown wrapper):
{
  "title": "UP Police Reasoning: [Topic Name] - Exam Preparation Notes",
  "summary": "2-3 sentence overview highlighting key exam focus areas",
  "key_points": [
    "Most important exam point 1 (with specific facts/numbers)",
    "Most important exam point 2",
    "Most important exam point 3",
    "Most important exam point 4",
    "Most important exam point 5"
  ],
  "sections": [
    {
      "title": "Section heading (exam-relevant)",
      "content": "Comprehensive content with markdown formatting. Include specific facts, dates, numbers. Use **bold** for key terms, \`code\` for numbers/codes, ==highlights== for critical points.\\n\\n**Example Format:**\\n- First key point with details\\n- Second key point\\n\\nShort paragraph explaining concepts.",
      "subsections": [
        {
          "title": "Subtopic heading",
          "content": "Detailed subtopic content following same formatting rules"
        }
      ],
      "highlights": [
        {
          "type": "exam_tip" | "important_fact" | "mnemonic" | "previous_year",
          "text": "Important highlighted information for exam"
        }
      ]
    }
  ],
  "practice_questions": [
    {
      "question": "Full MCQ question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "B",
      "explanation": "Detailed explanation with reasoning and related facts"
    }
  ]
}

Remember: Create comprehensive, exam-focused notes that help students ace the UP Police Constable 2026 Mental Aptitude & Reasoning section.`;

    const topicContext = topic
      ? `Focus specifically on: ${topic}`
      : "Provide comprehensive Mental Aptitude & Reasoning coverage for UP Police exam";

    const userPrompt = `Generate comprehensive UP Police Constable 2026 Mental Aptitude & Reasoning study notes.

${topicContext}

Requirements:
- Cover all relevant Reasoning syllabus topics for UP Police exam
- Include current affairs from last 6 months
- Add UP State Reasoning (10-15% weightage)
- Provide 15-20 practice MCQs with detailed explanations
- Use memory hooks and mnemonics for easy retention
- Focus on high-frequency exam topics
- Include quick revision points

Create detailed, exam-focused content that maximizes student success in UP Police Reasoning section.`;

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 30,
      })
      .eq("id", note_id);

    // Call AI to generate content
    console.log("Calling AI for UP Police Reasoning content generation...");
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 10000, // Reduced from 8500 to avoid incomplete JSON
      responseFormat: "json",
    });

    logAIUsage(
      "generate-uppolice-reasoning-notes",
      aiResponse.tokensUsed,
      aiResponse.webSearchUsed,
      aiResponse.modelUsed,
    );

    console.log("AI generation complete with", aiResponse.modelUsed);

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 70,
      })
      .eq("id", note_id);

    // Parse AI response
    let responseText = aiResponse.content;
    let cleanedJson = responseText.trim();

    // Remove markdown code blocks if present
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Validate JSON is complete (check for closing brace)
    if (!cleanedJson.endsWith("}") && !cleanedJson.endsWith("]}")) {
      console.error("Incomplete JSON detected, attempting to fix...");
      // Try to close the JSON if it's incomplete
      cleanedJson = cleanedJson + (cleanedJson.includes('"practice_questions"') ? "]}" : "}");
    }

    let structuredContent;
    try {
      structuredContent = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      console.error("First 500 chars:", cleanedJson.substring(0, 500));
      console.error("Last 500 chars:", cleanedJson.substring(cleanedJson.length - 500));
      throw new Error(`Failed to parse generated content: ${parseError.message}`);
    }

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 90,
      })
      .eq("id", note_id);

    // Store in database
    const { error: updateError } = await supabase
      .from("study_notes")
      .update({
        title: structuredContent.title || "UP Police Reasoning Notes",
        summary: structuredContent.summary,
        key_points: structuredContent.key_points || [],
        structured_content: {
          sections: structuredContent.sections || [],
          practice_questions: structuredContent.practice_questions || [],
        },
        raw_content: JSON.stringify(structuredContent),
        category: "UP Police 2026",
        subject: "Mental Aptitude & Reasoning",
        processing_status: "completed",
        processing_progress: 100,
        processing_error: null,
        user_id: user_id,
      })
      .eq("id", note_id);

    if (updateError) {
      console.error("Failed to update note:", updateError);
      throw updateError;
    }

    console.log("UP Police Reasoning notes generated and stored successfully");

    // Trigger recall questions generation asynchronously
    try {
      fetch(`${SUPABASE_URL}/functions/v1/generate-recall-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          note_id,
          structured_content: { sections: structuredContent.sections || [] },
          max_questions_per_section: 3,
        }),
      }).catch((err) => console.error("Failed to trigger recall questions:", err));
    } catch (e) {
      console.error("Error triggering recall questions:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        title: structuredContent.title,
        sections_count: structuredContent.sections?.length || 0,
        practice_questions_count: structuredContent.practice_questions?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in generate-uppolice-reasoning-notes:", error);

    // Update note status to failed (use note_id from outer scope)
    if (note_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("study_notes")
          .update({
            processing_status: "failed",
            processing_error: error.message || "UP Police Reasoning notes generation failed",
          })
          .eq("id", note_id);
      } catch (e) {
        console.error("Failed to update error status:", e);
      }
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
