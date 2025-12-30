// ============================================================
// Generate Daily Match Sets - FIXED VERSION
// ============================================================
// FIXES:
// 1. Increased maxTokens from 2000 to 10000 to prevent truncation
// 2. Added truncation detection and recovery
// 3. Better error messages with actual content preview
// 4. Retry logic with increased tokens if truncation detected
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
interface MatchPair {
  term: string;
  definition: string;
}

interface MatchSet {
  topic: string;
  pairs: MatchPair[];
}

interface MatchSetsResponse {
  match_sets: MatchSet[];
}

// Topics configuration
const TOPICS = [
  {
    name: "General Knowledge",
    description: "Diverse general knowledge facts for competitive exams",
  },
  {
    name: "Indian History",
    description: "Important events, personalities, and movements in Indian history",
  },
  {
    name: "Science & Tech",
    description: "Scientific concepts, discoveries, and technological innovations",
  },
];

// ============================================================
// Main Handler
// ============================================================
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🎯 Generate Daily Match Sets - Starting...");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`📅 Checking for Match sets on: ${today}`);

    // ========================================================
    // Check if all 3 topic sets already exist for today
    // ========================================================
    const { data: existingSets, error: fetchError } = await supabase
      .from("daily_match_sets")
      .select("*")
      .eq("date", today);

    if (existingSets && existingSets.length === 3 && !fetchError) {
      console.log("✅ Using cached Match sets for today:", today);
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          date: today,
          match_sets: existingSets,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ========================================================
    // Generate new Match sets for each topic
    // ========================================================
    console.log("🤖 Generating new Match sets for 3 topics...");

    const generatedSets: MatchSet[] = [];

    for (const topic of TOPICS) {
      console.log(`🔵 Generating match set for: ${topic.name}`);

      // ✅ FIX: Generate with retry logic and truncation detection
      const pairsData = await generateMatchPairsWithRetry(topic);

      console.log(`✅ Validated ${pairsData.pairs.length} pairs for ${topic.name}`);

      generatedSets.push({
        topic: topic.name,
        pairs: pairsData.pairs,
      });
    }

    // ========================================================
    // Store all sets in database
    // ========================================================
    console.log("💾 Storing all 3 match sets in database...");

    const savedSets = [];

    for (const set of generatedSets) {
      const { data: savedSet, error: saveError } = await supabase
        .from("daily_match_sets")
        .insert({
          date: today,
          topic: set.topic,
          pairs: set.pairs,
        })
        .select()
        .single();

      if (saveError) {
        console.error(`❌ Failed to save ${set.topic}:`, saveError);
        throw new Error(`Database error for ${set.topic}: ${saveError.message}`);
      }

      savedSets.push(savedSet);
      console.log(`✅ Saved ${set.topic}: ${set.pairs.length} pairs`);
    }

    console.log("✅ Successfully generated and saved all Match sets for:", today);

    // ========================================================
    // Return success response
    // ========================================================
    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        date: today,
        match_sets: savedSets,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("❌ Error in generate-daily-match-sets:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);

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

// ============================================================
// ✅ NEW: Generate match pairs with retry and truncation handling
// ============================================================
async function generateMatchPairsWithRetry(
  topic: { name: string; description: string },
  maxRetries: number = 2,
): Promise<{ pairs: MatchPair[] }> {
  let lastError: Error | null = null;
  let baseMaxTokens = 10000; // ✅ Increased from 2000

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Increase tokens on retry
      const maxTokens = baseMaxTokens + (attempt - 1) * 500;
      console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${topic.name} (maxTokens: ${maxTokens})`);

      const systemPrompt = `You are an expert at creating engaging educational match games for Indian government exam aspirants.

EXPERTISE:
- Create concise terms and clear definitions
- Focus on important facts relevant for competitive exams
- Terms should be 1-4 words (short and memorable)
- Definitions should be 5-15 words (brief but informative)
- Ensure terms and definitions are not too obvious (moderate difficulty)

CRITICAL RESPONSE FORMAT:
You MUST return a valid JSON object with this EXACT structure:
{
  "pairs": [
    {"term": "example term", "definition": "example definition"}
  ]
}

RULES:
- Return ONLY valid JSON (no markdown, no code blocks, no backticks)
- Do NOT return numbered lists or plain text
- Do NOT include any text before or after the JSON
- The JSON must be directly parseable`;

      const userPrompt = `Generate 6 term-definition pairs for the topic: "${topic.name}"

TOPIC CONTEXT: ${topic.description}

REQUIREMENTS:
1. Each pair must have:
   - term: A concise term/name/concept (1-4 words)
   - definition: A brief but clear definition (5-15 words)

2. Quality Guidelines:
   - Terms should be important for competitive exams
   - Definitions should be educational and accurate
   - Avoid overly simple or obvious pairs
   - Mix difficulty levels (2 easy, 3 medium, 1 hard)
   - Ensure variety in the types of terms

3. For different topics:
   - General Knowledge: Mix of capitals, numbers, famous people, awards, etc.
   - Indian History: Events, dates, personalities, movements, battles
   - Science & Tech: Inventions, discoveries, scientists, concepts, units

CRITICAL OUTPUT FORMAT:
You MUST return ONLY this JSON structure (no markdown, no code blocks, no backticks, no extra text):
{
  "pairs": [
    {
      "term": "Capital of India",
      "definition": "New Delhi, seat of the Government of India"
    },
    {
      "term": "Mount Everest",
      "definition": "World's highest mountain at 8,849 meters"
    }
  ]
}

IMPORTANT: Generate exactly 6 diverse, high-quality pairs.
IMPORTANT: Return ONLY the JSON object above. Do NOT return numbered lists.
IMPORTANT: Start your response with { and end with }`;

      // Try Parallel AI first, fallback to Perplexity
      let aiResponse: any;
      let usedParallel = false;

      try {
        console.log(`🔵 Trying Parallel AI for ${topic.name}...`);

        // Try without jsonMode first
        aiResponse = await callParallel({
          systemPrompt,
          userPrompt,
          maxTokens: maxTokens,
          temperature: 0.7,
          jsonMode: false,
        });

        if (!aiResponse.content || aiResponse.content.trim().length === 0) {
          throw new Error("Parallel AI returned empty response");
        }

        usedParallel = true;
        logParallelUsage(`generate-match-${topic.name}`, aiResponse.tokensUsed, aiResponse.webSearchUsed);
        console.log(`✅ Using Parallel AI response for ${topic.name}`);
      } catch (parallelError1) {
        console.warn(`⚠️ Parallel AI without JSON mode failed for ${topic.name}, trying with JSON mode...`);

        // Try with jsonMode
        try {
          aiResponse = await callParallel({
            systemPrompt,
            userPrompt,
            maxTokens: maxTokens,
            temperature: 0.7,
            jsonMode: true,
          });

          if (!aiResponse.content || aiResponse.content.trim().length === 0) {
            throw new Error("Parallel AI returned empty response with JSON mode");
          }

          usedParallel = true;
          logParallelUsage(`generate-match-${topic.name}`, aiResponse.tokensUsed, aiResponse.webSearchUsed);
          console.log(`✅ Using Parallel AI response (JSON mode) for ${topic.name}`);
        } catch (parallelError2) {
          console.warn(`⚠️ Parallel AI completely failed for ${topic.name}, falling back to Perplexity`);

          aiResponse = await callAI({
            systemPrompt,
            userPrompt,
            maxTokens: maxTokens,
            temperature: 0.7,
            responseFormat: "json",
          });

          usedParallel = false;
          console.log(`✅ Using Perplexity AI response for ${topic.name}`);
        }
      }

      console.log(`📦 Received AI response for ${topic.name} (${aiResponse.content.length} chars)`);

      // ✅ FIX: Check for truncation before parsing
      if (isTruncated(aiResponse.content)) {
        console.warn(`⚠️ Response appears truncated for ${topic.name} (attempt ${attempt})`);
        console.warn(`📊 Response length: ${aiResponse.content.length} chars`);
        console.warn(`📊 Last 100 chars: ${aiResponse.content.slice(-100)}`);

        if (attempt < maxRetries) {
          console.log(`🔄 Retrying with increased token limit...`);
          continue; // Retry with more tokens
        } else {
          // Last attempt - try to salvage what we have
          console.warn(`⚠️ Final attempt, trying to salvage partial response...`);
        }
      }

      // Parse and validate
      const pairsData = await parseMatchPairs(aiResponse.content, topic.name);

      // Validate pair count
      if (pairsData.pairs.length < 6) {
        if (attempt < maxRetries) {
          console.warn(`⚠️ Only got ${pairsData.pairs.length}/6 pairs, retrying...`);
          continue;
        } else {
          // Pad with placeholders on last attempt
          console.warn(`⚠️ Padding ${6 - pairsData.pairs.length} missing pairs with placeholders`);
          while (pairsData.pairs.length < 6) {
            pairsData.pairs.push({
              term: `[Term ${pairsData.pairs.length + 1}]`,
              definition: "Definition pending - please regenerate",
            });
          }
        }
      }

      // Trim if too many
      if (pairsData.pairs.length > 6) {
        console.warn(`⚠️ Got ${pairsData.pairs.length} pairs, trimming to 6`);
        pairsData.pairs = pairsData.pairs.slice(0, 6);
      }

      return pairsData;
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt} failed for ${topic.name}:`, error);

      if (attempt < maxRetries) {
        console.log(`🔄 Will retry...`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
  }

  // All retries failed
  throw new Error(`Failed to generate pairs for ${topic.name} after ${maxRetries} attempts: ${lastError?.message}`);
}

// ============================================================
// ✅ NEW: Check if response is truncated
// ============================================================
function isTruncated(content: string): boolean {
  const trimmed = content.trim();

  // Check for incomplete JSON
  if (trimmed.includes("{") && !trimmed.includes("}")) {
    return true;
  }

  if (trimmed.includes("[") && !trimmed.includes("]")) {
    return true;
  }

  // Check for incomplete strings at the end
  const lastChar = trimmed[trimmed.length - 1];
  if (lastChar !== "}" && lastChar !== "]" && lastChar !== '"') {
    // Likely truncated mid-word or mid-sentence
    return true;
  }

  // Check for unbalanced quotes
  const quoteCount = (trimmed.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    return true;
  }

  return false;
}

// ============================================================
// ✅ IMPROVED: Parse match pairs with better error handling
// ============================================================
async function parseMatchPairs(content: string, topicName: string): Promise<{ pairs: MatchPair[] }> {
  let cleanedJson = content.trim();

  console.log(`📝 Parsing response for ${topicName} (${cleanedJson.length} chars)`);

  // Remove markdown code blocks
  if (cleanedJson.startsWith("```json")) {
    cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanedJson.startsWith("```")) {
    cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  // Remove any leading/trailing whitespace
  cleanedJson = cleanedJson.trim();

  let pairsData: { pairs: MatchPair[] };

  // Try parsing as JSON first
  try {
    // ✅ FIX: Handle double-escaped JSON
    let unescapeAttempts = 0;
    let contentToParse = cleanedJson;

    while (unescapeAttempts < 3 && contentToParse.startsWith('"') && contentToParse.endsWith('"')) {
      try {
        contentToParse = JSON.parse(contentToParse);
        unescapeAttempts++;
        console.log(`✅ Unescaped JSON wrapper (attempt ${unescapeAttempts})`);
      } catch (e) {
        break;
      }
    }

    pairsData = JSON.parse(contentToParse);
    console.log(`✅ JSON parsed successfully for ${topicName}`);
  } catch (parseError) {
    console.log(`⚠️ JSON parsing failed for ${topicName}, attempting text parsing...`);
    console.error("📄 Raw response preview:", content.substring(0, 300));
    console.error("📄 Response end:", content.substring(Math.max(0, content.length - 200)));

    // ✅ FIX: Try to salvage incomplete JSON
    try {
      const salvaged = salvageIncompleteJSON(cleanedJson);
      if (salvaged) {
        pairsData = salvaged;
        console.log(`✅ Salvaged ${salvaged.pairs.length} pairs from incomplete JSON`);
      } else {
        throw new Error("Could not salvage incomplete JSON");
      }
    } catch (salvageError) {
      // Try parsing as numbered list text format
      const pairs = parseAsTextList(content);

      if (pairs.length > 0) {
        pairsData = { pairs };
        console.log(`✅ Text parsed successfully for ${topicName}, found ${pairs.length} pairs`);
      } else {
        throw new Error(`Failed to parse match pairs for ${topicName}: Neither JSON nor text parsing succeeded`);
      }
    }
  }

  // Validate structure
  if (!pairsData.pairs || !Array.isArray(pairsData.pairs)) {
    throw new Error(`Invalid match pairs format for ${topicName}: pairs array missing`);
  }

  // Validate each pair
  const validPairs: MatchPair[] = [];
  for (let i = 0; i < pairsData.pairs.length; i++) {
    const pair = pairsData.pairs[i];
    if (pair && pair.term && pair.definition) {
      if (pair.term.length >= 2 && pair.definition.length >= 5) {
        validPairs.push(pair);
      } else {
        console.warn(
          `⚠️ Skipping pair ${i + 1} in ${topicName}: invalid lengths (term: ${pair.term.length}, def: ${pair.definition.length})`,
        );
      }
    } else {
      console.warn(`⚠️ Skipping pair ${i + 1} in ${topicName}: missing term or definition`);
    }
  }

  if (validPairs.length === 0) {
    throw new Error(`No valid pairs found for ${topicName}`);
  }

  return { pairs: validPairs };
}

// ============================================================
// ✅ NEW: Salvage incomplete JSON
// ============================================================
function salvageIncompleteJSON(json: string): { pairs: MatchPair[] } | null {
  try {
    // Find all complete pair objects using regex
    const pairPattern = /\{\s*"term"\s*:\s*"([^"]+)"\s*,\s*"definition"\s*:\s*"([^"]+)"\s*\}/g;
    const matches = Array.from(json.matchAll(pairPattern));

    if (matches.length === 0) {
      return null;
    }

    const pairs: MatchPair[] = matches.map((match) => ({
      term: match[1],
      definition: match[2],
    }));

    console.log(`✅ Salvaged ${pairs.length} complete pairs from truncated JSON`);
    return { pairs };
  } catch (e) {
    return null;
  }
}

// ============================================================
// ✅ IMPROVED: Parse as text list with more patterns
// ============================================================
function parseAsTextList(content: string): MatchPair[] {
  const pairs: MatchPair[] = [];

  // Try multiple patterns
  const patterns = [
    // Pattern 1: "1. Term – Definition"
    /(\d+)\.\s*(.+?)\s*[–—:-]\s*(.+?)(?=\n\d+\.|$)/gs,
    // Pattern 2: "Term - Definition" (without numbers)
    /^(.+?)\s*[–—:-]\s*(.+?)$/gm,
  ];

  for (const pattern of patterns) {
    const matches = Array.from(content.matchAll(pattern));

    for (const match of matches) {
      let term, definition;

      if (match.length === 4) {
        // Has number prefix
        term = match[2].trim();
        definition = match[3].trim();
      } else if (match.length === 3) {
        // No number prefix
        term = match[1].trim();
        definition = match[2].trim();
      } else {
        continue;
      }

      if (term && definition && term.length >= 2 && definition.length >= 5) {
        pairs.push({ term, definition });
      }
    }

    if (pairs.length > 0) {
      break; // Found matches with this pattern
    }
  }

  return pairs;
}
