// Generate Teach Me Session - Create Socratic teaching sessions from study notes
// Uses Parallel AI with Sonar Pro → GPT-4-turbo fallback for exam-focused guidance
// Implements step-by-step learning with 3-dimensional feedback (Concept/Writing/Exam Mistake)

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

interface GenerateSessionRequest {
  note_id: string
  user_id: string
}

const EXAM_TYPES = ['CBSE', 'SSC', 'UPSC', 'Railway', 'Banking', 'State PSC', 'Teaching', 'Police', 'Defence', 'Judiciary']

// Step type configurations for all 6 steps
const STEP_CONFIGS = {
  1: { type: 'warm_up', question_type: 'TRUE_FALSE' },
  2: { type: 'core_thinking', question_type: 'ANSWER_WRITING' },
  3: { type: 'core_thinking', question_type: 'ANSWER_WRITING' },
  4: { type: 'core_thinking', question_type: 'ANSWER_WRITING' },
  5: { type: 'application', question_type: 'MCQ' },
  6: { type: 'integration', question_type: 'CONCEPT_SEQUENCING' }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { note_id, user_id }: GenerateSessionRequest = await req.json()

    if (!note_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'note_id and user_id are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🎓 Generating Teach Me session for note:', note_id)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch note content from study_notes table
    const { data: note, error: fetchError } = await supabase
      .from('study_notes')
      .select('title, summary, key_points, detailed_content')
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
    if (!note.summary && !note.key_points && !note.detailed_content) {
      throw new Error('Note has no content. Please ensure the note has been fully processed.')
    }

    // Build content for AI prompt
    const contentForPrompt = `
Title: ${note.title}

Summary:
${note.summary || 'N/A'}

Key Points:
${Array.isArray(note.key_points) ? note.key_points.join('\n') : 'N/A'}

Detailed Content:
${note.detailed_content || 'N/A'}
`.trim().substring(0, 10000)

    console.log('🤖 Generating ALL 6 steps for complete session...')

    // Generate all steps in one AI call for efficiency
    const systemPrompt = `You are an expert Socratic teacher for Indian competitive exams. Generate a complete 6-step teaching session.

STEP REQUIREMENTS:
Step 1 (warm_up, TRUE_FALSE): Simple true/false to activate prior knowledge
Step 2 (core_thinking, ANSWER_WRITING): Basic application question (2-3 sentences)
Step 3 (core_thinking, ANSWER_WRITING): Deeper analysis question (2-3 sentences)
Step 4 (core_thinking, ANSWER_WRITING): Critical thinking question (2-3 sentences)
Step 5 (application, MCQ): Multiple choice with 4 options testing practical application
Step 6 (integration, CONCEPT_SEQUENCING): Arrange 4 items in correct order

For NON-ANSWER_WRITING questions (Steps 1, 5, 6):
- Include "explanation" field with why the answer is correct and why wrong options are wrong
- Explanation should be educational and exam-focused

Return ONLY valid JSON array without markdown.`

    const userPrompt = `Create complete 6-step session for this content:

${contentForPrompt}

OUTPUT FORMAT (return ONLY this JSON array):
[
  {
    "step_number": 1,
    "step_type": "warm_up",
    "question_type": "TRUE_FALSE",
    "question_text": "...",
    "correct_answer": "TRUE" or "FALSE",
    "exam_tag": "Relevant exam",
    "exam_context": "Exam relevance",
    "hint": "Optional hint",
    "explanation": "Why this is true/false and exam relevance"
  },
  {
    "step_number": 2,
    "step_type": "core_thinking",
    "question_type": "ANSWER_WRITING",
    "question_text": "...",
    "correct_answer": "Model answer",
    "exam_tag": "Relevant exam",
    "exam_context": "Exam relevance",
    "hint": "Optional hint"
  },
  ... (steps 3-6 following same pattern)
]`

    console.log('🤖 Calling AI for complete session generation...')

    let aiResponse: any
    let modelUsed = 'parallel-speed'

    // Try Parallel AI first
    try {
      aiResponse = await callParallel({
        systemPrompt,
        userPrompt,
        temperature: 0.6,
        maxTokens: 4000,
        jsonMode: true
      })
      console.log('✅ Parallel AI succeeded')
    } catch (parallelError) {
      console.log('⚠️ Parallel AI failed, falling back to ai-client:', parallelError.message)

      const fallbackResponse = await callAI({
        systemPrompt,
        userPrompt,
        temperature: 0.6,
        maxTokens: 4000,
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

    // Parse AI response
    let allSteps: any[]
    try {
      const cleanedJson = aiResponse.content.trim()
        .replace(/^```json\s*/, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')

      allSteps = JSON.parse(cleanedJson)

      if (!Array.isArray(allSteps) || allSteps.length !== 6) {
        throw new Error(`Expected 6 steps, got ${Array.isArray(allSteps) ? allSteps.length : 'non-array'}`)
      }
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError)
      console.error('Response text:', aiResponse.content.substring(0, 500))
      throw new Error(`Failed to parse AI response: ${parseError.message}`)
    }

    // Validate all steps
    for (const step of allSteps) {
      if (!step.question_text || !step.correct_answer || !step.exam_tag) {
        throw new Error(`Invalid step ${step.step_number}: missing required fields`)
      }
    }

    console.log('✅ All 6 steps generated and validated')

    // Extract first step for response
    const firstStep = allSteps[0]

    // Create session record
    const { data: session, error: sessionError } = await supabase
      .from('teach_me_sessions')
      .insert({
        user_id,
        note_id,
        current_step: 1,
        total_steps: 6,
        steps: allSteps,
        exam_tags: allSteps.map(s => s.exam_tag).filter((tag, idx, arr) => arr.indexOf(tag) === idx),
        is_completed: false
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Failed to create session:', sessionError)
      throw sessionError
    }

    console.log('🎉 Session created:', session.id)

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        note_id,
        current_step: 1,
        total_steps: 6,
        step_data: firstStep,
        model_used: modelUsed,
        session
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in generate-teach-me-session:', error)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
