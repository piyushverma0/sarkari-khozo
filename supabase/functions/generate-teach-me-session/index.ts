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

    // Fetch note content from generated_notes table
    const { data: note, error: fetchError } = await supabase
      .from('generated_notes')
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

    // Generate Step 1 (Warm-up with True/False question)
    const systemPrompt = `You are an expert Socratic teacher for Indian competitive exams. You guide students through logical thinking checkpoints.

STEP 1 GUIDELINES (Warm-up):
- Create ONE True/False question to activate prior knowledge
- Question should be simple but fundamental to the topic
- Tag with relevant exam (${EXAM_TYPES.join(', ')})
- Include warm context ("Asked in [EXAM] basics" or "Common in [EXAM]")

Return ONLY valid JSON without markdown.`

    const userPrompt = `Create Step 1 warm-up question for this content:

${contentForPrompt}

OUTPUT FORMAT (return ONLY this JSON):
{
  "step_number": 1,
  "step_type": "warm_up",
  "question_type": "TRUE_FALSE",
  "question_text": "Clear true/false statement",
  "correct_answer": "TRUE" or "FALSE",
  "exam_tag": "Relevant exam from: ${EXAM_TYPES.join(', ')}",
  "exam_context": "e.g., 'Asked in CBSE Class 10 basics' or 'Common in SSC CGL prelims'",
  "hint": "Optional gentle nudge if stuck"
}`

    console.log('🤖 Calling Parallel AI for Step 1 generation...')

    let aiResponse: any
    let modelUsed = 'parallel-speed'

    // Try Parallel AI first
    try {
      aiResponse = await callParallel({
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 1000,
        jsonMode: true,
        jsonSchema: {
          name: "teach_me_step_1",
          strict: true,
          schema: {
            type: "object",
            properties: {
              step_number: { type: "number" },
              step_type: { type: "string" },
              question_type: { type: "string" },
              question_text: { type: "string" },
              correct_answer: { type: "string" },
              exam_tag: { type: "string" },
              exam_context: { type: "string" },
              hint: { type: "string" }
            },
            required: ["step_number", "step_type", "question_type", "question_text", "correct_answer", "exam_tag", "exam_context"],
            additionalProperties: false
          }
        }
      })
      console.log('✅ Parallel AI succeeded')
    } catch (parallelError) {
      console.log('⚠️ Parallel AI failed, falling back to ai-client (Sonar Pro → GPT-4):', parallelError.message)

      // Fallback to ai-client (Sonar Pro → GPT-4)
      const fallbackResponse = await callAI({
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 1000,
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
    let stepData
    try {
      const cleanedJson = aiResponse.content.trim()
        .replace(/^```json\s*/, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')

      stepData = JSON.parse(cleanedJson)
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError)
      console.error('Response text:', aiResponse.content.substring(0, 500))
      throw new Error(`Failed to parse AI response: ${parseError.message}`)
    }

    // Validate step data
    if (!stepData.question_text || !stepData.correct_answer || !stepData.exam_tag) {
      throw new Error('Invalid step data from AI')
    }

    console.log('✅ Step 1 generated:', stepData.question_text.substring(0, 50) + '...')

    // Create session record
    const { data: session, error: sessionError } = await supabase
      .from('teach_me_sessions')
      .insert({
        user_id,
        note_id,
        current_step: 1,
        total_steps: 6,
        steps: [stepData],
        exam_tags: [stepData.exam_tag],
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
        step_data: stepData,
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
