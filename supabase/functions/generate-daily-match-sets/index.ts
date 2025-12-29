// ============================================================
// Generate Daily Match Sets
// ============================================================
// Creates 3 topic-based match games per day using Parallel AI
// Each topic has 6 term-definition pairs
// Caches results to avoid regenerating same day
// Used for home screen "Match" section
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { callParallel, logParallelUsage } from '../_shared/parallel-client.ts'
import { callAI } from '../_shared/ai-client.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================
// Types
// ============================================================
interface MatchPair {
  term: string
  definition: string
}

interface MatchSet {
  topic: string
  pairs: MatchPair[]
}

interface MatchSetsResponse {
  match_sets: MatchSet[]
}

// Topics configuration
const TOPICS = [
  {
    name: "General Knowledge",
    description: "Diverse general knowledge facts for competitive exams"
  },
  {
    name: "Indian History",
    description: "Important events, personalities, and movements in Indian history"
  },
  {
    name: "Science & Tech",
    description: "Scientific concepts, discoveries, and technological innovations"
  }
]

// ============================================================
// Main Handler
// ============================================================
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎯 Generate Daily Match Sets - Starting...')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    console.log(`📅 Checking for Match sets on: ${today}`)

    // ========================================================
    // Check if all 3 topic sets already exist for today
    // ========================================================
    const { data: existingSets, error: fetchError } = await supabase
      .from('daily_match_sets')
      .select('*')
      .eq('date', today)

    if (existingSets && existingSets.length === 3 && !fetchError) {
      console.log('✅ Using cached Match sets for today:', today)
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          date: today,
          match_sets: existingSets
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // ========================================================
    // Generate new Match sets for each topic
    // ========================================================
    console.log('🤖 Generating new Match sets for 3 topics...')

    const generatedSets: MatchSet[] = []

    for (const topic of TOPICS) {
      console.log(`🔵 Generating match set for: ${topic.name}`)

      const systemPrompt = `You are an expert at creating engaging educational match games for Indian government exam aspirants.

EXPERTISE:
- Create concise terms and clear definitions
- Focus on important facts relevant for competitive exams
- Terms should be 1-4 words (short and memorable)
- Definitions should be 5-15 words (brief but informative)
- Ensure terms and definitions are not too obvious (moderate difficulty)
- Always return valid JSON without markdown formatting

RESPONSE FORMAT:
Always return ONLY valid JSON (no markdown, no code blocks, no backticks)`

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

OUTPUT FORMAT (return ONLY this JSON structure, no markdown):
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

Generate exactly 6 diverse, high-quality pairs. Return ONLY the JSON.`

      // Try Parallel AI first, fallback to Perplexity
      let aiResponse: any
      let usedParallel = false

      try {
        console.log(`🔵 Trying Parallel AI for ${topic.name}...`)

        // Try without jsonMode first
        try {
          aiResponse = await callParallel({
            systemPrompt,
            userPrompt,
            maxTokens: 2000,
            temperature: 0.7,
            jsonMode: false
          })

          if (!aiResponse.content || aiResponse.content.trim().length === 0) {
            throw new Error('Parallel AI returned empty response')
          }

          usedParallel = true
          logParallelUsage(`generate-match-${topic.name}`, aiResponse.tokensUsed, aiResponse.webSearchUsed)
          console.log(`✅ Using Parallel AI response for ${topic.name}`)

        } catch (parallelError1) {
          console.warn(`⚠️ Parallel AI without JSON mode failed for ${topic.name}`)

          // Try with jsonMode
          aiResponse = await callParallel({
            systemPrompt,
            userPrompt,
            maxTokens: 2000,
            temperature: 0.7,
            jsonMode: true
          })

          if (!aiResponse.content || aiResponse.content.trim().length === 0) {
            throw new Error('Parallel AI returned empty response with JSON mode')
          }

          usedParallel = true
          logParallelUsage(`generate-match-${topic.name}`, aiResponse.tokensUsed, aiResponse.webSearchUsed)
          console.log(`✅ Using Parallel AI response (JSON mode) for ${topic.name}`)
        }

      } catch (parallelError) {
        console.warn(`⚠️ Parallel AI failed for ${topic.name}, falling back to Perplexity`)

        aiResponse = await callAI({
          systemPrompt,
          userPrompt,
          maxTokens: 2000,
          temperature: 0.7,
          responseFormat: "json"
        })

        usedParallel = false
        console.log(`✅ Using Perplexity AI response for ${topic.name}`)
      }

      console.log(`📦 Received AI response for ${topic.name}`)

      // Parse JSON
      let cleanedJson = aiResponse.content.trim()

      // Remove markdown code blocks
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      let pairsData: { pairs: MatchPair[] }
      try {
        let parsed = JSON.parse(cleanedJson)
        
        // Handle double-stringified JSON
        if (typeof parsed === "string") {
          console.log(`🔄 Detected double-stringified JSON for ${topic.name}, parsing again...`)
          parsed = JSON.parse(parsed)
        }
        
        // Handle case where AI returns array directly instead of { pairs: [...] }
        if (Array.isArray(parsed)) {
          console.log(`🔄 Detected array response for ${topic.name}, wrapping in pairs object...`)
          pairsData = { pairs: parsed }
        } else {
          pairsData = parsed
        }
        
        console.log(`✅ JSON parsed successfully for ${topic.name}`)
      } catch (parseError: unknown) {
        const errorMsg = parseError instanceof Error ? parseError.message : String(parseError)
        console.error(`❌ Failed to parse JSON for ${topic.name}:`, errorMsg)
        console.error('📄 Raw response:', aiResponse.content.substring(0, 500))
        throw new Error(`Failed to parse match pairs for ${topic.name}: ${errorMsg}`)
      }

      // Validate structure
      if (!pairsData.pairs || !Array.isArray(pairsData.pairs)) {
        console.error(`❌ Invalid structure for ${topic.name}. Keys:`, Object.keys(pairsData || {}))
        throw new Error(`Invalid match pairs format for ${topic.name}: pairs array missing`)
      }

      if (pairsData.pairs.length !== 6) {
        console.warn(`⚠️ Pair count mismatch for ${topic.name}: expected 6, got ${pairsData.pairs.length}`)
        // Don't throw, just warn - we'll use what we got
      }

      // Validate each pair
      for (let i = 0; i < pairsData.pairs.length; i++) {
        const pair = pairsData.pairs[i]
        if (!pair.term || !pair.definition) {
          throw new Error(`Pair ${i + 1} in ${topic.name} is missing term or definition`)
        }
        if (pair.term.length < 2 || pair.definition.length < 5) {
          throw new Error(`Pair ${i + 1} in ${topic.name} has invalid lengths`)
        }
      }

      console.log(`✅ Validated ${pairsData.pairs.length} pairs for ${topic.name}`)

      generatedSets.push({
        topic: topic.name,
        pairs: pairsData.pairs
      })
    }

    // ========================================================
    // Store all sets in database
    // ========================================================
    console.log('💾 Storing all 3 match sets in database...')

    const savedSets = []

    for (const set of generatedSets) {
      const { data: savedSet, error: saveError } = await supabase
        .from('daily_match_sets')
        .insert({
          date: today,
          topic: set.topic,
          pairs: set.pairs
        })
        .select()
        .single()

      if (saveError) {
        console.error(`❌ Failed to save ${set.topic}:`, saveError)
        throw new Error(`Database error for ${set.topic}: ${saveError.message}`)
      }

      savedSets.push(savedSet)
      console.log(`✅ Saved ${set.topic}: ${set.pairs.length} pairs`)
    }

    console.log('✅ Successfully generated and saved all Match sets for:', today)

    // ========================================================
    // Return success response
    // ========================================================
    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        date: today,
        match_sets: savedSets
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('❌ Error in generate-daily-match-sets:', errorMsg)

    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        details: String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
