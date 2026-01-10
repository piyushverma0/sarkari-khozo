// Generate Notes Summary - Transform raw content into structured study notes
// Uses Sonar Pro (primary) with GPT-4-turbo fallback
// FIXED: Handles incomplete JSON responses and prevents body consumption errors

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { callAI, logAIUsage } from "../_shared/ai-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SummarizeRequest {
  note_id: string;
  raw_content: string;
  language: string;
}

/**
 * Detect subject from content using keyword matching
 * Returns detected subject or null if no clear match
 */
function detectSubject(content: string): string | null {
  const lowerContent = content.toLowerCase();

  const subjectPatterns: Record<string, string[]> = {
    Mathematics: [
      "formula",
      "equation",
      "theorem",
      "proof",
      "derivative",
      "integral",
      "algebra",
      "geometry",
      "trigonometry",
      "calculus",
      "quadratic",
      "logarithm",
      "matrix",
      "vector",
      "polynomial",
      "fraction",
    ],
    Polity: [
      "article",
      "constitution",
      "parliament",
      "fundamental rights",
      "fundamental duties",
      "directive principles",
      "amendment",
      "lok sabha",
      "rajya sabha",
      "supreme court",
      "president",
      "governor",
      "judiciary",
      "legislature",
      "executive",
    ],
    Economy: [
      "gdp",
      "inflation",
      "fiscal",
      "monetary",
      "wpi",
      "cpi",
      "budget",
      "tax",
      "revenue",
      "expenditure",
      "deficit",
      "surplus",
      "rbi",
      "reserve bank",
      "banking",
      "finance",
      "market",
      "trade",
      "export",
      "import",
    ],
    History: [
      "battle",
      "dynasty",
      "emperor",
      "movement",
      "treaty",
      "independence",
      "revolution",
      "freedom struggle",
      "colonial",
      "ancient",
      "medieval",
      "modern",
      "mughal",
      "british",
      "revolt",
      "war",
    ],
    Geography: [
      "climate",
      "latitude",
      "longitude",
      "mountain",
      "river",
      "soil",
      "agriculture",
      "monsoon",
      "ocean",
      "desert",
      "plateau",
      "plain",
      "forest",
      "ecosystem",
      "mineral",
      "resources",
    ],
    Science: [
      "cell",
      "atom",
      "molecule",
      "reaction",
      "energy",
      "force",
      "motion",
      "physics",
      "chemistry",
      "biology",
      "organism",
      "photosynthesis",
      "element",
      "compound",
      "mass",
      "velocity",
      "acceleration",
    ],
    "General Knowledge": [
      "current affairs",
      "awards",
      "sports",
      "books",
      "authors",
      "prizes",
      "nobel",
      "oscar",
      "olympics",
      "world cup",
      "summit",
      "organization",
      "who",
      "unesco",
      "un",
      "commonwealth",
    ],
  };

  // Count keyword matches for each subject
  const scores: Record<string, number> = {};

  for (const [subject, keywords] of Object.entries(subjectPatterns)) {
    scores[subject] = 0;
    for (const keyword of keywords) {
      // Count occurrences of each keyword
      const regex = new RegExp("\\b" + keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi");
      const matches = lowerContent.match(regex);
      if (matches) {
        scores[subject] += matches.length;
      }
    }
  }

  // Find subject with highest score
  let maxScore = 0;
  let detectedSubject: string | null = null;

  for (const [subject, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedSubject = subject;
    }
  }

  // Only return subject if score is significant (at least 3 keyword matches)
  return maxScore >= 3 ? detectedSubject : null;
}

/**
 * Build cheat-code generation prompt based on detected subject
 */
function buildCheatCodePrompt(subject: string | null, content: string): string {
  const subjectGuidance = subject ? `Subject Detected: **${subject}**\n\n` : "";

  const prompt = `${subjectGuidance}You are an exam preparation expert. Analyze the content and create ULTRA-COMPRESSED memory hooks for last-minute revision.

Generate "Cheat-Code Blocks" using these patterns:

1. **For Mathematics**: Extract ALL formulas in minimal notation
   Format: "Formula Name = actual formula"
   Example: {"key": "Quadratic", "value": "ax² + bx + c = 0"}

2. **For Polity**: List articles/laws as key-value pairs
   Format: "Article Number = Core Concept"
   Example: {"key": "A14", "value": "Equality before law"}

3. **For Economy**: Create ratio/comparison shortcuts
   Format: "Concept = Quick Rule"
   Example: {"key": "WPI > CPI", "value": "Wholesale prices rise faster"}

4. **For History**: Date-Event timeline
   Format: "YYYY = Event (Impact)"
   Example: {"key": "1857", "value": "First Freedom Struggle (Failed)"}

5. **For General Knowledge**: One-liner facts (max 8 words each)
   Format: "Topic: Key Fact"
   Example: {"key": "Nobel 2023", "value": "Katalin Karikó (mRNA vaccines)"}

6. **For Geography**: Location/Feature facts
   Format: "Place/Feature = Key Info"
   Example: {"key": "Himalayas", "value": "Youngest fold mountains, 2400km"}

7. **For Science**: Definitions and laws
   Format: "Term/Law = Definition"
   Example: {"key": "Newton's 1st", "value": "Body at rest stays at rest"}

RULES:
- Maximum 20 items per block
- Each item value: MAX 10 words
- Use symbols (=, →, |) NOT full sentences
- Focus on exam patterns, not explanations
- NO verbose descriptions
- Use mnemonics where helpful
- Create multiple blocks if multiple topics exist
- ONLY create blocks if content has exam-relevant memory hooks
- If no clear memory hooks exist, return empty array

Return ONLY valid JSON (no markdown, no backticks):
{
  "cheatCodeBlocks": [
    {
      "id": "unique_id_1",
      "type": "formula_sheet" | "article_list" | "ratio_tricks" | "one_liners" | "date_timeline" | "keyword_mapping" | "quick_facts" | "memory_hooks" | "comparison_table",
      "title": "Descriptive title (e.g., Maths Formula Booster)",
      "subject": "${subject || "General"}",
      "items": [
        {
          "key": "short key",
          "value": "compressed value (max 10 words)",
          "hint": "optional mnemonic"
        }
      ],
      "emoji": "📐" (relevant emoji),
      "display_order": 0
    }
  ]
}

Content to analyze:
${content.substring(0, 15000)}

Remember: Return ONLY the JSON object with cheatCodeBlocks array. If no memory hooks found, return {"cheatCodeBlocks": []}`;

  return prompt;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let note_id: string | undefined;
  let requestBody: SummarizeRequest | undefined; // ✅ FIX: Store parsed body

  try {
    // ✅ FIX: Parse body once and store it
    requestBody = await req.json();
    note_id = requestBody.note_id;
    const raw_content = requestBody.raw_content;
    const language = requestBody.language;

    if (!note_id || !raw_content) {
      return new Response(JSON.stringify({ error: "note_id and raw_content are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating summary for note:", note_id, "Content length:", raw_content.length);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Detect subject from content
    const detectedSubject = detectSubject(raw_content);
    console.log("Detected subject:", detectedSubject);

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_status: "summarizing",
        processing_progress: 60,
      })
      .eq("id", note_id);

    // Build the system prompt
    const systemPrompt = `You are an expert study assistant specializing in Indian government exams, jobs, and educational content. Transform the following text into clean, well-structured study notes optimized for learning and exam preparation.

**CRITICAL: Keep response under 10,000 tokens to ensure complete JSON delivery. Be concise - prioritize quality over quantity.**

CRITICAL REQUIREMENTS:
1. Create clear hierarchical sections with descriptive headings
2. Extract and highlight ALL key points as bullet lists
3. Identify and emphasize:
   - Important dates and deadlines (mark as urgent if within 30 days)
   - Eligibility criteria (age, education, nationality)
   - Application fees and payment details
   - Selection process and exam pattern
   - Required documents
   - Application steps and procedures
   - Salary/benefits (if job posting)
   - Contact information and helplines
4. Create a concise 2-3 sentence summary capturing the main purpose
5. Preserve ALL critical information - do NOT omit details
6. Format for maximum readability and comprehension
7. Extract URLs and links separately with clear labels
8. Identify any action items or important deadlines

MARKDOWN FORMATTING RULES (for content field):
1. **Paragraph Length**: NO paragraph should exceed 4 lines (~320 characters)
   - If content is longer, break into multiple short paragraphs OR convert to bullet points
   - Example: Instead of one long 8-line paragraph, create two 3-line paragraphs or a 2-line intro + bullet list
2. **Use Rich Markdown**:
   - Headings: Use ### for subsection titles (already in section.title, don't repeat in content)
   - Bold: Use **text** for important terms, dates, numbers, fees
   - Italic: Use *text* for emphasis or definitions
   - Code/Numbers: Use \`text\` for specific codes, application numbers, reference IDs
   - Highlights: Use ==text== for critical information that needs attention
   - Lists: Use bullet points (- or •) for multiple items
3. **Visual Clarity**:
   - Add blank lines between paragraphs for breathing room
   - Use bullet points for 3+ related items instead of comma-separated lists
   - Bold all numbers (fees, ages, vacancies, dates)
   - Highlight deadlines and urgent information with ==text==
4. **Examples**:
   BAD: "The application fee for general category is Rs. 500 and for SC/ST/OBC is Rs. 250 payable through online mode via debit card, credit card or net banking and candidates must keep the payment receipt for future reference."
   GOOD: "**Application Fee:**\\n- General Category: **Rs. 500**\\n- SC/ST/OBC: **Rs. 250**\\n\\nPayment accepted via debit card, credit card, or net banking. ==Keep payment receipt for future reference.=="

OUTPUT FORMAT: Return ONLY valid JSON (no markdown, no backticks):
{
  "title": "Clear, descriptive title (max 100 chars)",
  "summary": "2-3 sentence overview of the content",
  "key_points": [
    "Most important point 1",
    "Most important point 2",
    "Most important point 3"
  ],
  "sections": [
    {
      "title": "Section heading",
      "content": "Main content using markdown formatting. Keep paragraphs under 4 lines. Use **bold**, *italic*, \`code\`, ==highlights==, and bullet points. Example:\\n\\n**Important Info:** This is a short 2-3 line paragraph with key details.\\n\\n- First bullet point\\n- Second bullet point\\n\\nAnother short paragraph if needed.",
      "subsections": [
        {
          "title": "Subsection heading",
          "content": "Subsection content with same markdown formatting rules"
        }
      ],
      "highlights": [
        {
          "type": "deadline",
          "text": "Highlighted information",
          "date": "YYYY-MM-DD"
        }
      ],
      "links": [
        {
          "text": "Link description",
          "url": "https://...",
          "type": "application"
        }
      ]
    }
  ],
  "important_dates": [
    {
      "event": "Application Start",
      "date": "YYYY-MM-DD",
      "is_deadline": false
    },
    {
      "event": "Last Date to Apply",
      "date": "YYYY-MM-DD",
      "is_deadline": true
    }
  ],
  "action_items": [
    "Action that needs to be taken 1",
    "Action that needs to be taken 2"
  ]
}

Remember: Return ONLY the JSON object, nothing else. Keep response under 10,000 tokens to ensure complete JSON.`;

    const userPrompt = `TEXT TO PROCESS:\n${raw_content.substring(0, 30000)}`;

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 70,
      })
      .eq("id", note_id);

    // Call AI (Sonar Pro → GPT-4-turbo fallback)
    console.log("Calling AI for summarization...");

    // ✅ FIX: Increased from 8192 to 10000
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 10000,
      responseFormat: "json",
    });

    logAIUsage("generate-notes-summary", aiResponse.tokensUsed, aiResponse.webSearchUsed, aiResponse.modelUsed);

    console.log("AI summarization complete with", aiResponse.modelUsed);
    console.log("Output tokens:", aiResponse.tokensUsed);

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 85,
      })
      .eq("id", note_id);

    // Extract response text
    let responseText = aiResponse.content;

    if (!responseText.trim()) {
      throw new Error("Empty response from AI");
    }

    // Clean up response (remove markdown code blocks if present)
    let cleanedJson = responseText.trim();
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // ✅ FIX: Comprehensive JSON repair
    cleanedJson = repairIncompleteJSON(cleanedJson);

    // Parse JSON
    let structuredContent;
    try {
      structuredContent = JSON.parse(cleanedJson);
    } catch (parseError: any) {
      console.error("❌ Failed to parse JSON after repair:", parseError);
      console.error("📏 Response length:", cleanedJson.length);
      console.error("🔍 First 500 chars:", cleanedJson.substring(0, 500));
      console.error("🔍 Last 500 chars:", cleanedJson.substring(cleanedJson.length - 500));

      // ✅ FIX: Try aggressive repair
      cleanedJson = aggressiveJSONRepair(cleanedJson);

      try {
        structuredContent = JSON.parse(cleanedJson);
        console.log("✅ Aggressive repair succeeded!");
      } catch (finalError: any) {
        console.error("❌ Aggressive repair also failed");
        throw new Error(`Failed to parse summary: ${finalError.message}`);
      }
    }

    console.log("Structured content generated:", Object.keys(structuredContent));

    // Validate structure
    if (!structuredContent.title || !structuredContent.sections) {
      console.warn("⚠️ Missing required fields, adding defaults");
      structuredContent.title = structuredContent.title || "Study Notes";
      structuredContent.summary = structuredContent.summary || "Study notes summary";
      structuredContent.key_points = structuredContent.key_points || [];
      structuredContent.sections = structuredContent.sections || [];
    }

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 90,
      })
      .eq("id", note_id);

    // Generate cheat-code blocks (if subject detected)
    let cheatCodeBlocks: any[] = [];
    if (detectedSubject) {
      try {
        console.log("Generating cheat-code blocks for subject:", detectedSubject);

        const cheatCodePrompt = buildCheatCodePrompt(detectedSubject, raw_content);

        const cheatCodeResponse = await callAI({
          systemPrompt: "You are an exam preparation expert specializing in ultra-compressed memory hooks.",
          userPrompt: cheatCodePrompt,
          temperature: 0.4,
          maxTokens: 4096,
          responseFormat: "json",
        });

        logAIUsage(
          "generate-notes-summary (cheat-codes)",
          cheatCodeResponse.tokensUsed,
          cheatCodeResponse.webSearchUsed,
          cheatCodeResponse.modelUsed,
        );

        let cheatCodeText = cheatCodeResponse.content.trim();

        // Clean up response (remove markdown code blocks if present)
        if (cheatCodeText.startsWith("```json")) {
          cheatCodeText = cheatCodeText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cheatCodeText.startsWith("```")) {
          cheatCodeText = cheatCodeText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const cheatCodeData = JSON.parse(cheatCodeText);
        cheatCodeBlocks = cheatCodeData.cheatCodeBlocks || [];

        console.log("Generated", cheatCodeBlocks.length, "cheat-code blocks");
      } catch (cheatCodeError) {
        console.error("Failed to generate cheat-code blocks:", cheatCodeError);
        // Don't fail the entire process, just log the error
        cheatCodeBlocks = [];
      }
    } else {
      console.log("No subject detected, skipping cheat-code generation");
    }

    // Update progress
    await supabase
      .from("study_notes")
      .update({
        processing_progress: 95,
      })
      .eq("id", note_id);

    // Store in database
    // Note: Only store sections in structured_content since title, summary, and key_points
    // are stored separately. This matches the Kotlin NoteContent model which only has sections.
    const { error: updateError } = await supabase
      .from("study_notes")
      .update({
        title: structuredContent.title || "Study Notes",
        summary: structuredContent.summary,
        key_points: structuredContent.key_points || [],
        structured_content: { sections: structuredContent.sections || [] },
        cheat_code_blocks: cheatCodeBlocks.length > 0 ? cheatCodeBlocks : null,
        has_cheat_codes: cheatCodeBlocks.length > 0,
        processing_status: "completed",
        processing_progress: 100,
        processing_error: null,
      })
      .eq("id", note_id);

    if (updateError) {
      console.error("Failed to update note with summary:", updateError);
      throw updateError;
    }

    console.log("✅ Summary stored in database, note processing complete");

    // Trigger recall questions generation asynchronously (fire and forget)
    try {
      console.log("Triggering recall questions generation for note:", note_id);

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
      }).catch((err) => {
        console.error("Failed to trigger recall questions generation:", err);
        // Don't fail the main process
      });

      console.log("Recall questions generation triggered (async)");
    } catch (triggerError) {
      console.error("Error triggering recall questions:", triggerError);
      // Continue without failing
    }

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        title: structuredContent.title,
        sections_count: structuredContent.sections?.length || 0,
        key_points_count: structuredContent.key_points?.length || 0,
        cheat_code_blocks_count: cheatCodeBlocks.length,
        has_cheat_codes: cheatCodeBlocks.length > 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("❌ Error in generate-notes-summary:", error);

    // ✅ FIX: Use stored variables instead of re-parsing body
    if (note_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        await supabase
          .from("study_notes")
          .update({
            processing_status: "failed",
            processing_error: error.message || "Summary generation failed",
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

// ============================================================
// ✅ JSON Repair Functions (Same as other fixed functions)
// ============================================================

function repairIncompleteJSON(json: string): string {
  let repaired = json.trim();

  // ✅ FIX: Close unterminated strings FIRST (before counting brackets)
  // Find last quote and check if it's unterminated
  const lastQuoteIndex = repaired.lastIndexOf('"');
  if (lastQuoteIndex > 0) {
    // Check if quote is escaped
    const beforeQuote = repaired.substring(0, lastQuoteIndex);
    const escapedQuotes = (beforeQuote.match(/\\"/g) || []).length;
    const totalQuotes = (repaired.match(/"/g) || []).length;

    // If odd number of quotes (excluding escaped), we have unterminated string
    if ((totalQuotes - escapedQuotes) % 2 !== 0) {
      console.log("🔧 Detected unterminated string, closing it...");

      // Find where the unterminated string likely started
      // Look for common patterns like "key": "value (unterminated)
      const afterLastQuote = repaired.substring(lastQuoteIndex + 1);

      // If there's content after last quote without closing quote, truncate it and add quote
      if (afterLastQuote.length > 0 && !afterLastQuote.startsWith(":") && !afterLastQuote.startsWith(",")) {
        // Remove incomplete content after last quote
        repaired = repaired.substring(0, lastQuoteIndex + 1) + '"';
        console.log("✅ Closed unterminated string");
      }
    }
  }

  // Remove trailing commas
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

    // Close unclosed arrays first
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

function aggressiveJSONRepair(json: string): string {
  console.log("🔨 Attempting aggressive JSON repair...");

  let repaired = json.trim();

  // Strategy 1: Find the last COMPLETE field and truncate after it
  // Look for patterns like: "field": "value",  or  "field": [...],
  const fieldPatterns = [
    /"key_points"\s*:\s*\[[^\]]*\]/, // key_points array (complete)
    /"summary"\s*:\s*"[^"]*"/, // summary field (complete)
    /"title"\s*:\s*"[^"]*"/, // title field (complete)
  ];

  let lastCompleteFieldEnd = -1;
  for (const pattern of fieldPatterns) {
    const match = repaired.match(pattern);
    if (match) {
      const endPos = repaired.indexOf(match[0]) + match[0].length;
      if (endPos > lastCompleteFieldEnd) {
        lastCompleteFieldEnd = endPos;
      }
    }
  }

  if (lastCompleteFieldEnd > 0) {
    console.log(`✂️ Found last complete field at position ${lastCompleteFieldEnd}`);
    // Truncate everything after last complete field and close JSON
    repaired = repaired.substring(0, lastCompleteFieldEnd);

    // Add missing closing for incomplete arrays/objects
    const openBraces = (repaired.match(/{/g) || []).length;
    const closeBraces = (repaired.match(/}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/]/g) || []).length;

    // Close arrays
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += "]";
    }

    // Close objects
    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += "}";
    }

    console.log("✅ Truncated to last complete field and closed JSON");

    try {
      JSON.parse(repaired);
      return repaired;
    } catch (e) {
      console.log("⚠️ Still broken after truncation, trying minimal extraction...");
    }
  }

  // Strategy 2: Create minimal valid JSON from extractable fields
  console.log("🔍 Extracting minimal valid JSON structure...");

  const titleMatch = repaired.match(/"title"\s*:\s*"([^"]*)"/);
  const summaryMatch = repaired.match(/"summary"\s*:\s*"([^"]*)"/);

  // Extract key_points if it's complete
  let keyPoints: string[] = [];
  const keyPointsMatch = repaired.match(/"key_points"\s*:\s*\[([\s\S]*?)\](?=\s*,)/);
  if (keyPointsMatch) {
    try {
      keyPoints = JSON.parse(`[${keyPointsMatch[1]}]`);
    } catch (e) {
      // If parse fails, extract individual items
      const items = keyPointsMatch[1].match(/"([^"]*)"/g);
      keyPoints = items ? items.map((s) => s.replace(/"/g, "")) : [];
    }
  }

  const minimalJSON = {
    title: titleMatch ? titleMatch[1] : "Study Notes",
    summary: summaryMatch ? summaryMatch[1] : "Study notes summary",
    key_points: keyPoints,
    sections: [], // Empty sections rather than trying to extract broken ones
    important_dates: [],
    action_items: [],
  };

  console.log("✅ Created minimal valid JSON");
  return JSON.stringify(minimalJSON);
}
