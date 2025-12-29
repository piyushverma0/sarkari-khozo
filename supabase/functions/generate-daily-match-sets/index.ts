// ============================================================
// Generate Daily Match Sets
// ============================================================
// Creates 3 topic-based match games per day using Parallel AI
// Each topic has 6 term-definition pairs
// Caches results to avoid regenerating same day
// Used for home screen "Match" section
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
        try {
          aiResponse = await callParallel({
            systemPrompt,
            userPrompt,
            maxTokens: 2000,
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
          console.warn(`⚠️ Parallel AI without JSON mode failed for ${topic.name}`);

          // Try with jsonMode
          aiResponse = await callParallel({
            systemPrompt,
            userPrompt,
            maxTokens: 2000,
            temperature: 0.7,
            jsonMode: true,
          });

          if (!aiResponse.content || aiResponse.content.trim().length === 0) {
            throw new Error("Parallel AI returned empty response with JSON mode");
          }

          usedParallel = true;
          logParallelUsage(`generate-match-${topic.name}`, aiResponse.tokensUsed, aiResponse.webSearchUsed);
          console.log(`✅ Using Parallel AI response (JSON mode) for ${topic.name}`);
        }
      } catch (parallelError) {
        console.warn(`⚠️ Parallel AI failed for ${topic.name}, falling back to Perplexity`);

        aiResponse = await callAI({
          systemPrompt,
          userPrompt,
          maxTokens: 2000,
          temperature: 0.7,
          jsonMode: true,
        });

        usedParallel = false;
        console.log(`✅ Using Perplexity AI response for ${topic.name}`);
      }

      console.log(`📦 Received AI response for ${topic.name}`);

      // Parse JSON or text response
      let cleanedJson = aiResponse.content.trim();

      // Remove markdown code blocks
      if (cleanedJson.startsWith("```json")) {
        cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      let pairsData: { pairs: MatchPair[] };

      // Try parsing as JSON first
      try {
        pairsData = JSON.parse(cleanedJson);
        console.log(`✅ JSON parsed successfully for ${topic.name}`);
      } catch (parseError) {
        console.log(`⚠️ JSON parsing failed for ${topic.name}, attempting text parsing...`);
        console.error("📄 Raw response:", aiResponse.content.substring(0, 500));

        // Try parsing as numbered list text format
        try {
          const pairs: MatchPair[] = [];
          const content = aiResponse.content.trim();

          // Match patterns like:
          // 1. Term – Definition
          // 1. Term - Definition
          // 1. Term: Definition
          const pairRegex = /(\d+)\.\s*(.+?)\s*[–—:-]\s*(.+?)(?=\n\d+\.|$)/gs;

          let match;
          while ((match = pairRegex.exec(content)) !== null) {
            const term = match[2].trim();
            const definition = match[3].trim();

            if (term && definition) {
              pairs.push({ term, definition });
            }
          }

          if (pairs.length === 0) {
            // Try alternative format: each line is "term - definition"
            const lines = content.split("\n").filter((line) => line.trim());
            for (const line of lines) {
              const separatorMatch = line.match(/^(?:\d+\.\s*)?(.+?)\s*[–—:-]\s*(.+)$/);
              if (separatorMatch) {
                const term = separatorMatch[1].trim();
                const definition = separatorMatch[2].trim();
                if (term && definition) {
                  pairs.push({ term, definition });
                }
              }
            }
          }

          if (pairs.length > 0) {
            pairsData = { pairs };
            console.log(`✅ Text parsed successfully for ${topic.name}, found ${pairs.length} pairs`);
          } else {
            throw new Error("No valid pairs found in text response");
          }
        } catch (textParseError) {
          console.error(`❌ Text parsing also failed for ${topic.name}:`, textParseError);
          throw new Error(`Failed to parse match pairs for ${topic.name}: Neither JSON nor text parsing succeeded`);
        }
      }

      // Validate structure
      if (!pairsData.pairs || !Array.isArray(pairsData.pairs)) {
        throw new Error(`Invalid match pairs format for ${topic.name}: pairs array missing`);
      }

      if (pairsData.pairs.length !== 6) {
        throw new Error(`Invalid pair count for ${topic.name}: expected 6, got ${pairsData.pairs.length}`);
      }

      // Validate each pair
      for (let i = 0; i < pairsData.pairs.length; i++) {
        const pair = pairsData.pairs[i];
        if (!pair.term || !pair.definition) {
          throw new Error(`Pair ${i + 1} in ${topic.name} is missing term or definition`);
        }
        if (pair.term.length < 2 || pair.definition.length < 5) {
          throw new Error(`Pair ${i + 1} in ${topic.name} has invalid lengths`);
        }
      }

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
  } catch (error) {
    console.error("❌ Error in generate-daily-match-sets:", error);

    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// ============================================================
// Usage Example:
// ============================================================
// Call this function from your Android app:
//
// POST https://your-project.supabase.co/functions/v1/generate-daily-match-sets
// Headers:
//   - Authorization: Bearer YOUR_ANON_KEY
//   - Content-Type: application/json
// Body: {}
//
// Response:
// {
//   "success": true,
//   "cached": false,
//   "date": "2024-12-28",
//   "match_sets": [
//     {
//       "topic": "General Knowledge",
//       "pairs": [ ... 6 pairs ... ]
//     },
//     ...
//   ]
// }
// ============================================================
