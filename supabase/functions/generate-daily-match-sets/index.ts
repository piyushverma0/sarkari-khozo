// ============================================================
// Generate Daily Match Sets - COMPLETE FIXED VERSION
// ============================================================
// FIXES APPLIED:
// 1. Increased maxTokens: 2000 → 15000
// 2. Enhanced system prompt with strict 6-12 word limit
// 3. Added validation for definition length and completeness
// 4. Added retry logic with truncation detection
// 5. Added salvage logic for incomplete JSON
// 6. Better error messages and logging
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

    // Check if all 3 topic sets already exist for today
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

    // Generate new Match sets for each topic
    console.log("🤖 Generating new Match sets for 3 topics...");

    const generatedSets: MatchSet[] = [];

    for (const topic of TOPICS) {
      console.log(`🔵 Generating match set for: ${topic.name}`);

      // Generate with retry logic and validation
      const pairsData = await generateMatchPairsWithRetry(topic);

      console.log(`✅ Generated and validated ${pairsData.pairs.length} pairs for ${topic.name}`);

      generatedSets.push({
        topic: topic.name,
        pairs: pairsData.pairs,
      });
    }

    // Store all sets in database
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
// Generate match pairs with retry logic
// ============================================================
async function generateMatchPairsWithRetry(
  topic: { name: string; description: string },
  maxRetries: number = 2,
): Promise<{ pairs: MatchPair[] }> {
  let lastError: Error | null = null;
  let baseMaxTokens = 15000; // ✅ Increased from 2000

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const maxTokens = baseMaxTokens + (attempt - 1) * 500;
      console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${topic.name} (maxTokens: ${maxTokens})`);

      // ✅ ENHANCED SYSTEM PROMPT
      const systemPrompt = `You are an expert at creating match card games for Indian government exam students.

CRITICAL REQUIREMENTS:
1. Terms: 1-3 words maximum (one concept, name, or phrase)
2. Definitions: EXACTLY 6-12 words (complete sentences only)
3. Every definition must stand alone and be immediately understandable
4. NO incomplete sentences, NO trailing phrases
5. NO phrases ending with: "of the", "about the", "under a", "in the", etc.

QUALITY RULES:
- Terms must be specific and recognizable
- Definitions must be concise but complete
- Each pair must make ONE clear match (no ambiguity)
- Difficulty: Mix of 2 easy, 3 medium, 1 hard
- Definitions should be facts, not vague descriptions

OUTPUT FORMAT:
{
  "pairs": [
    {"term": "short term", "definition": "Complete sentence with 6-12 words exactly."}
  ]
}

CRITICAL: Every definition must be a complete thought that fits in 6-12 words.`;

      // ✅ ENHANCED USER PROMPT WITH EXAMPLES
      const userPrompt = `Generate 6 term-definition pairs for: "${topic.name}"

TOPIC CONTEXT: ${topic.description}

STRICT FORMAT RULES:
1. Terms: 1-3 words (names, concepts, technologies)
2. Definitions: 6-12 words ONLY (complete sentences)
3. NO trailing phrases, NO incomplete thoughts
4. Start with the actual explanation, not filler words

---

${getExamplesForTopic(topic.name)}

---

YOUR TASK:
Generate EXACTLY 6 pairs for "${topic.name}" following the format above.

CRITICAL CHECKS:
- Count words: Each definition must be 6-12 words
- Complete sentences: No trailing "of the", "about the", etc.
- Clear matches: Term and definition should obviously pair together
- Factual accuracy: Definitions must be correct for competitive exams

Return ONLY valid JSON (no markdown, no code blocks, no extra text):
{
  "pairs": [
    {"term": "...", "definition": "..."},
    {"term": "...", "definition": "..."},
    {"term": "...", "definition": "..."},
    {"term": "...", "definition": "..."},
    {"term": "...", "definition": "..."},
    {"term": "...", "definition": "..."}
  ]
}`;

      // Try Parallel AI first, fallback to Perplexity
      let aiResponse: any;
      let usedParallel = false;

      try {
        console.log(`🔵 Trying Parallel AI for ${topic.name}...`);

        aiResponse = await callParallel({
          systemPrompt,
          userPrompt,
          maxTokens: maxTokens,
          temperature: 0.7,
          jsonMode: true,
        });

        if (!aiResponse.content || aiResponse.content.trim().length === 0) {
          throw new Error("Parallel AI returned empty response");
        }

        usedParallel = true;
        logParallelUsage(`generate-match-${topic.name}`, aiResponse.tokensUsed, aiResponse.webSearchUsed);
        console.log(`✅ Using Parallel AI response for ${topic.name}`);
      } catch (parallelError) {
        console.warn(`⚠️ Parallel AI failed for ${topic.name}, falling back to Perplexity`);

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

      console.log(`📦 Received AI response for ${topic.name} (${aiResponse.content.length} chars)`);

      // ✅ Check for truncation
      if (isTruncated(aiResponse.content)) {
        console.warn(`⚠️ Response appears truncated for ${topic.name} (attempt ${attempt})`);
        console.warn(`📊 Response length: ${aiResponse.content.length} chars`);
        console.warn(`📊 Last 100 chars: ${aiResponse.content.slice(-100)}`);

        if (attempt < maxRetries) {
          console.log(`🔄 Retrying with increased token limit...`);
          continue;
        } else {
          console.warn(`⚠️ Final attempt, trying to salvage partial response...`);
        }
      }

      // Parse and validate
      const pairsData = await parseAndValidateMatchPairs(aiResponse.content, topic.name);

      // Check pair count
      if (pairsData.pairs.length < 6) {
        if (attempt < maxRetries) {
          console.warn(`⚠️ Only got ${pairsData.pairs.length}/6 valid pairs, retrying...`);
          continue;
        } else {
          // Pad with placeholders on last attempt
          console.warn(`⚠️ Padding ${6 - pairsData.pairs.length} missing pairs`);
          while (pairsData.pairs.length < 6) {
            pairsData.pairs.push({
              term: `Term ${pairsData.pairs.length + 1}`,
              definition: "Definition pending - please regenerate to get complete pairs.",
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
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // All retries failed
  throw new Error(`Failed to generate pairs for ${topic.name} after ${maxRetries} attempts: ${lastError?.message}`);
}

// ============================================================
// Get examples for specific topic
// ============================================================
function getExamplesForTopic(topicName: string): string {
  if (topicName === "Science & Tech") {
    return `EXAMPLES FOR SCIENCE & TECH:

✅ GOOD PAIRS:
{
  "term": "Photosynthesis",
  "definition": "Plants convert sunlight into chemical energy using chlorophyll successfully."
}
{
  "term": "DNA",
  "definition": "Genetic molecule containing hereditary information in all living organisms."
}
{
  "term": "Gravity",
  "definition": "Force attracting objects toward Earth's center or other masses."
}
{
  "term": "Electricity",
  "definition": "Flow of electric charge through conductors producing energy and power."
}
{
  "term": "Atom",
  "definition": "Smallest unit of matter retaining element's chemical properties completely."
}

❌ BAD PAIRS (Too long/incomplete):
{
  "term": "Photosynthesis",
  "definition": "Process by which green plants and some other organisms use sunlight to"
}
{
  "term": "Scientific Method",
  "definition": "Systematic approach involving observation, hypothesis formation, experimentation and analysis for"
}`;
  } else if (topicName === "Indian History") {
    return `EXAMPLES FOR INDIAN HISTORY:

✅ GOOD PAIRS:
{
  "term": "Quit India",
  "definition": "1942 mass movement demanding immediate British withdrawal from India."
}
{
  "term": "Jallianwala Bagh",
  "definition": "1919 Amritsar massacre where British killed hundreds of Indian protesters."
}
{
  "term": "Dandi March",
  "definition": "Gandhi's 1930 salt satyagraha protesting against British salt monopoly."
}
{
  "term": "Sepoy Mutiny",
  "definition": "1857 rebellion by Indian soldiers against British East India Company."
}
{
  "term": "Partition",
  "definition": "1947 division of British India into India and Pakistan nations."
}

❌ BAD PAIRS (Too long/incomplete):
{
  "term": "Non-Cooperation",
  "definition": "Movement launched by Mahatma Gandhi in 1920 that aimed to resist British rule through"
}`;
  } else {
    // General Knowledge
    return `EXAMPLES FOR GENERAL KNOWLEDGE:

✅ GOOD PAIRS:
{
  "term": "UNESCO",
  "definition": "United Nations agency promoting education, science and cultural cooperation worldwide."
}
{
  "term": "Mount Everest",
  "definition": "World's tallest mountain peak at 8849 meters in Himalayas."
}
{
  "term": "Reserve Bank",
  "definition": "India's central banking institution managing monetary policy and currency."
}
{
  "term": "Lok Sabha",
  "definition": "Lower house of India's Parliament with directly elected members."
}
{
  "term": "Fundamental Rights",
  "definition": "Basic human rights guaranteed to all Indian citizens by Constitution."
}

❌ BAD PAIRS (Too long/incomplete):
{
  "term": "Democracy",
  "definition": "A system of government where citizens exercise power by voting and electing"
}`;
  }
}

// ============================================================
// Check if response is truncated
// ============================================================
function isTruncated(content: string): boolean {
  const trimmed = content.trim();

  // Check for incomplete JSON brackets
  if (trimmed.includes("{") && !trimmed.includes("}")) return true;
  if (trimmed.includes("[") && !trimmed.includes("]")) return true;

  // Check for incomplete ending
  const lastChar = trimmed[trimmed.length - 1];
  if (lastChar !== "}" && lastChar !== "]" && lastChar !== '"') return true;

  // Check for unbalanced quotes
  const quoteCount = (trimmed.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) return true;

  return false;
}

// ============================================================
// Parse and validate match pairs
// ============================================================
async function parseAndValidateMatchPairs(content: string, topicName: string): Promise<{ pairs: MatchPair[] }> {
  let cleanedJson = content.trim();

  console.log(`📝 Parsing response for ${topicName} (${cleanedJson.length} chars)`);

  // Remove markdown code blocks
  if (cleanedJson.startsWith("```json")) {
    cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanedJson.startsWith("```")) {
    cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  cleanedJson = cleanedJson.trim();

  let pairsData: { pairs: MatchPair[] };

  // Try parsing as JSON
  try {
    // Handle double-escaped JSON
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
    console.log(`⚠️ JSON parsing failed for ${topicName}, attempting recovery...`);
    console.error("📄 Raw response preview:", content.substring(0, 300));

    // Try to salvage incomplete JSON
    const salvaged = salvageIncompleteJSON(cleanedJson);
    if (salvaged && salvaged.pairs.length > 0) {
      pairsData = salvaged;
      console.log(`✅ Salvaged ${salvaged.pairs.length} pairs from incomplete JSON`);
    } else {
      // Try parsing as text list
      const pairs = parseAsTextList(content);
      if (pairs.length > 0) {
        pairsData = { pairs };
        console.log(`✅ Text parsed successfully, found ${pairs.length} pairs`);
      } else {
        throw new Error(`Failed to parse match pairs for ${topicName}`);
      }
    }
  }

  // Validate structure
  if (!pairsData.pairs || !Array.isArray(pairsData.pairs)) {
    throw new Error(`Invalid match pairs format for ${topicName}: pairs array missing`);
  }

  // ✅ VALIDATE EACH PAIR
  const validPairs: MatchPair[] = [];

  for (let i = 0; i < pairsData.pairs.length; i++) {
    const pair = pairsData.pairs[i];

    if (!pair || !pair.term || !pair.definition) {
      console.warn(`⚠️ Skipping pair ${i + 1}: missing term or definition`);
      continue;
    }

    // Validate term length (1-4 words)
    const termWords = pair.term.trim().split(/\s+/).length;
    if (termWords > 4) {
      console.warn(`⚠️ Skipping pair ${i + 1}: term too long (${termWords} words)`);
      console.warn(`   Term: "${pair.term}"`);
      continue;
    }

    // ✅ VALIDATE DEFINITION LENGTH (6-12 words)
    const defWords = pair.definition.trim().split(/\s+/).length;
    if (defWords < 6 || defWords > 12) {
      console.warn(`⚠️ Skipping pair ${i + 1}: definition wrong length (${defWords} words, need 6-12)`);
      console.warn(`   Term: "${pair.term}"`);
      console.warn(`   Definition: "${pair.definition}"`);
      continue;
    }

    // ✅ CHECK FOR INCOMPLETE SENTENCES
    const endsIncomplete = /\s(of|the|a|an|to|for|with|in|at|by|from|about|under|that|which)$/i.test(pair.definition);
    if (endsIncomplete) {
      console.warn(`⚠️ Skipping pair ${i + 1}: definition appears incomplete`);
      console.warn(`   Term: "${pair.term}"`);
      console.warn(`   Definition: "${pair.definition}"`);
      continue;
    }

    // Ensure definition ends with punctuation
    if (!pair.definition.match(/[.!?]$/)) {
      pair.definition = pair.definition.trim() + ".";
    }

    // Passed all checks
    validPairs.push({
      term: pair.term.trim(),
      definition: pair.definition.trim(),
    });
  }

  if (validPairs.length === 0) {
    throw new Error(`No valid pairs found for ${topicName} after validation`);
  }

  console.log(`✅ Validated ${validPairs.length} pairs for ${topicName}`);

  return { pairs: validPairs };
}

// ============================================================
// Salvage incomplete JSON
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
// Parse as text list
// ============================================================
function parseAsTextList(content: string): MatchPair[] {
  const pairs: MatchPair[] = [];

  // Try multiple patterns
  const patterns = [/(\d+)\.\s*(.+?)\s*[–—:-]\s*(.+?)(?=\n\d+\.|$)/gs, /^(.+?)\s*[–—:-]\s*(.+?)$/gm];

  for (const pattern of patterns) {
    const matches = Array.from(content.matchAll(pattern));

    for (const match of matches) {
      let term, definition;

      if (match.length === 4) {
        term = match[2].trim();
        definition = match[3].trim();
      } else if (match.length === 3) {
        term = match[1].trim();
        definition = match[2].trim();
      } else {
        continue;
      }

      if (term && definition && term.length >= 2 && definition.length >= 10) {
        pairs.push({ term, definition });
      }
    }

    if (pairs.length > 0) {
      break;
    }
  }

  return pairs;
}
