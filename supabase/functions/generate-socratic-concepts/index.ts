// Generate Socratic Concepts - Map note content to 9 learning concepts
// Creates initial concept framework for Socratic teaching session
// Determines concept names, difficulty, and exam context

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { callParallel } from '../_shared/parallel-client.ts'
import { callAI } from '../_shared/ai-client.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateConceptsRequest {
  note_id: string
  user_id: string
}

const EXAM_TYPES = ['CBSE', 'SSC', 'UPSC', 'Railway', 'Banking', 'State PSC', 'Teaching', 'Police', 'Defence', 'Judiciary']

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { note_id, user_id }: GenerateConceptsRequest = await req.json()

    if (!note_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'note_id and user_id are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🎓 Generating Socratic concepts for note:', note_id)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch note content
    const { data: note, error: fetchError } = await supabase
      .from('study_notes')
      .select('title, summary, key_points, structured_content, extracted_text')
      .eq('id', note_id)
      .eq('user_id', user_id)
      .single()

    if (fetchError) {
      console.error('Database error fetching note:', fetchError)
      throw new Error(`Failed to fetch note: ${fetchError.message}`)
    }

    if (!note) {
      throw new Error('Note not found')
    }

    console.log('📝 Note fetched:', note.title)

    // Check if note has content
    if (!note.summary && !note.key_points && !note.extracted_text && !note.structured_content) {
      throw new Error('Note has no content. Please ensure the note has been fully processed.')
    }

    // Build content for AI prompt
    // Priority: extracted_text > structured_content as JSON string
    let detailedContent = 'N/A'
    if (note.extracted_text) {
      detailedContent = note.extracted_text
    } else if (note.structured_content) {
      // If structured_content exists but no extracted_text, stringify it
      try {
        detailedContent = JSON.stringify(note.structured_content, null, 2)
      } catch (e) {
        console.warn('Failed to stringify structured_content, using as-is')
        detailedContent = String(note.structured_content)
      }
    }

    const contentForPrompt = `
Title: ${note.title}

Summary:
${note.summary || 'N/A'}

Key Points:
${Array.isArray(note.key_points) ? note.key_points.join('\n') : 'N/A'}

Detailed Content:
${detailedContent}
`.trim().substring(0, 12000)

    console.log('🤖 Generating 9 learning concepts with AI...')

    // Generate 9 concepts using AI
    const systemPrompt = `You are an expert Indian competitive exam educator. Create a 9-concept learning progression for Socratic teaching.

CONCEPT FRAMEWORK (in order):
1. Foundation (easy) - Activate prior knowledge with open question
2. Core Concept A (medium) - Main idea introduction
3. Reasoning Check (medium) - Explain the "why"
4. Core Concept B (medium) - Related/complementary concept
5. Integration (hard) - Connect concepts A and B
6. Application (hard) - Apply to new scenario
7. Analysis (hard) - Break down complex case
8. Synthesis (very_hard) - Create or design something new
9. Exam Mastery (hard) - Exam-specific application

For each concept, provide:
- Concept name: Clear, specific learning goal
- Difficulty: easy, medium, hard, or very_hard
- Opening question: First Socratic question to ask
- Exam tag: Relevant exam from: ${EXAM_TYPES.join(', ')}
- Exam context: Why this matters for that exam

Return ONLY valid JSON array without markdown.`

    const userPrompt = `Create 9 Socratic learning concepts for this content:

${contentForPrompt}

OUTPUT FORMAT (return ONLY this JSON array):
[
  {
    "concept_number": 1,
    "concept_name": "Foundation: Understanding [basic concept]",
    "concept_difficulty": "easy",
    "opening_question": "What do you already know about [topic]?",
    "exam_tag": "CBSE",
    "exam_context": "Foundational for Class 10 Science"
  },
  {
    "concept_number": 2,
    "concept_name": "Core Concept: [main idea]",
    "concept_difficulty": "medium",
    "opening_question": "How would you explain [concept]?",
    "exam_tag": "SSC",
    "exam_context": "Common in SSC CGL General Awareness"
  },
  ... (concepts 3-9 following the framework)
]`

    let aiResponse: any
    let modelUsed = 'parallel-speed'

    // Try Parallel AI first
    try {
      aiResponse = await callParallel({
        systemPrompt,
        userPrompt,
        temperature: 0.6,
        maxTokens: 3000,
        jsonMode: true
      })
      console.log('✅ Parallel AI succeeded')
    } catch (parallelError) {
      console.log('⚠️ Parallel AI failed, falling back to ai-client:', parallelError.message)

      const fallbackResponse = await callAI({
        systemPrompt,
        userPrompt,
        temperature: 0.6,
        maxTokens: 3000,
        responseFormat: 'json'
      })

      aiResponse = {
        content: fallbackResponse.content,
        tokensUsed: fallbackResponse.tokensUsed
      }
      modelUsed = fallbackResponse.modelUsed || 'fallback-ai'
      console.log(`✅ Fallback AI succeeded with model: ${modelUsed}`)
    }

    console.log(`🎯 AI response complete (${modelUsed})`)

    // Parse AI response with multi-stage parsing to handle various formats
    let conceptsData: any[]
    try {
      let cleanContent = aiResponse.content.trim()

      // Step 1: Remove markdown code blocks if present
      const jsonBlockMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonBlockMatch) {
        cleanContent = jsonBlockMatch[1].trim()
      } else {
        // Also try removing generic code blocks
        cleanContent = cleanContent
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
          .trim()
      }

      // Step 2: Handle escaped JSON strings (AI sometimes returns \"[...\" instead of [...])
      if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
        try {
          // First unescape the string
          cleanContent = JSON.parse(cleanContent)
          console.log('✅ Unescaped JSON string wrapper')
        } catch (e) {
          console.warn('⚠️ Failed to unescape JSON string, trying as-is')
        }
      }

      // Step 3: Extract JSON array using regex as fallback
      const arrayMatch = cleanContent.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        conceptsData = JSON.parse(arrayMatch[0])
      } else {
        // Try parsing the whole content
        conceptsData = JSON.parse(cleanContent)
      }

      // Step 4: Validate array
      if (!Array.isArray(conceptsData)) {
        throw new Error(`Expected array, got ${typeof conceptsData}`)
      }

      if (conceptsData.length !== 9) {
        console.warn(`⚠️ Expected 9 concepts, got ${conceptsData.length}. Using what we have.`)
        // Only throw if we got significantly fewer concepts
        if (conceptsData.length < 5) {
          throw new Error(`Too few concepts: got ${conceptsData.length}, need at least 5`)
        }
      }

      console.log(`✅ Successfully parsed ${conceptsData.length} concepts`)

    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError)
      console.error('❌ Response preview (first 500 chars):', aiResponse.content.substring(0, 500))
      console.error('❌ Response preview (last 200 chars):', aiResponse.content.substring(Math.max(0, aiResponse.content.length - 200)))
      throw new Error(`Failed to parse AI response: ${parseError.message}`)
    }

    // Validate all concepts
    for (const concept of conceptsData) {
      if (!concept.concept_name || !concept.opening_question || !concept.exam_tag) {
        throw new Error(`Invalid concept ${concept.concept_number}: missing required fields`)
      }
    }

    console.log('✅ All 9 concepts generated and validated')

    // Transform into full Concept objects with conversation structure
    const concepts = conceptsData.map((c, idx) => ({
      concept_number: idx + 1,
      concept_name: c.concept_name,
      concept_difficulty: c.concept_difficulty || 'medium',
      conversation_turns: [
        {
          turn_number: 1,
          speaker: 'AI',
          message: c.opening_question,
          type: 'OPENING_QUESTION',
          timestamp: new Date().toISOString(),
          question_type: 'OPEN_ENDED'
        }
      ],
      is_mastered: false,
      understanding_score: 0,
      attempts: 0,
      misconceptions_identified: [],
      time_spent_seconds: 0,
      probing_questions_asked: 0,
      exam_tag: c.exam_tag,
      exam_context: c.exam_context || `Relevant for ${c.exam_tag}`
    }))

    // Create session record with Socratic mode
    const { data: session, error: sessionError } = await supabase
      .from('teach_me_sessions')
      .insert({
        user_id,
        note_id,
        teaching_mode: 'socratic',
        current_concept_index: 0,
        total_concepts: 9,
        concepts_mastered: 0,
        concepts: concepts,
        current_conversation: concepts[0].conversation_turns, // Start with first concept's opening
        student_understanding_level: 'beginner',
        concepts_to_revisit: [],
        concepts_skipped: [],
        misconceptions: [],
        total_conversation_turns: 1, // First AI question
        average_turns_per_concept: 0,
        exam_tags: [...new Set(concepts.map(c => c.exam_tag))],
        is_completed: false
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Failed to create session:', sessionError)
      throw sessionError
    }

    console.log('🎉 Socratic session created:', session.id)

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        note_id,
        teaching_mode: 'socratic',
        total_concepts: 9,
        first_concept: concepts[0].concept_name,
        opening_question: concepts[0].conversation_turns[0].message,
        model_used: modelUsed,
        session
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in generate-socratic-concepts:', error)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
