// Validate Teach Me Answer - Validate user responses and generate next steps
// Uses direct comparison for simple types and AI for answer writing
// Implements 3-dimensional exam lens feedback (Concept/Writing/Exam Mistake)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { callParallel } from '../_shared/parallel-client.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidateAnswerRequest {
  session_id: string
  step_number: number
  user_answer: string
  user_id: string
}

const EXAM_TYPES = ['CBSE', 'SSC', 'UPSC', 'Railway', 'Banking', 'State PSC', 'Teaching', 'Police', 'Defence', 'Judiciary']

// Step types configuration
const STEP_CONFIGS: Record<number, { type: string; question_type: string }> = {
  1: { type: 'warm_up', question_type: 'TRUE_FALSE' },
  2: { type: 'core_thinking', question_type: 'ANSWER_WRITING' },
  3: { type: 'core_thinking', question_type: 'ANSWER_WRITING' },
  4: { type: 'core_thinking', question_type: 'ANSWER_WRITING' },
  5: { type: 'application', question_type: 'MCQ' },
  6: { type: 'integration', question_type: 'CONCEPT_SEQUENCING' }
}

interface StepData {
  step_number: number
  step_type: string
  question_type: string
  question_text: string
  correct_answer: string
  exam_tag: string
  exam_context: string
  hint?: string
  options?: string[]
  items_to_sequence?: string[]
  user_answer?: string
  validation_result?: ValidationResult
  answered_at?: string
}

interface ValidationResult {
  is_correct: boolean
  feedback_type: string
  feedback_message: string
  score_percentage: number
  improvement_tip: string | null
  exam_relevance: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id, step_number, user_answer, user_id }: ValidateAnswerRequest = await req.json()

    if (!session_id || !step_number || !user_answer || !user_id) {
      return new Response(
        JSON.stringify({ error: 'session_id, step_number, user_answer, and user_id are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Validating answer for session:', session_id, 'Step:', step_number)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch session
    const { data: session, error: fetchError } = await supabase
      .from('teach_me_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user_id)
      .single()

    if (fetchError || !session) {
      throw new Error('Session not found')
    }

    console.log('📚 Session fetched, current step:', session.current_step)

    // Validate step number matches current step
    if (session.current_step !== step_number) {
      return new Response(
        JSON.stringify({ error: `Expected step ${session.current_step}, got ${step_number}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get current step data
    const steps: StepData[] = session.steps || []
    const currentStep = steps.find((s) => s.step_number === step_number)

    if (!currentStep) {
      throw new Error('Current step data not found')
    }

    console.log('🔍 Validating against:', currentStep.question_type)

    // Validate answer based on question type
    let validationResult: ValidationResult
    let isCorrect = false
    let feedbackType = 'CONCEPT_ISSUE' // Default for wrong answers

    if (currentStep.question_type === 'ANSWER_WRITING') {
      // Use AI for answer writing validation (Steps 2-4)
      console.log('🤖 Using AI for answer writing validation...')

      const systemPrompt = `You are an expert Indian competitive exam evaluator. Analyze student answers using 3-dimensional exam lens.

FEEDBACK TYPES:
1. 🧠 CONCEPT_ISSUE: Fundamental misunderstanding of the concept
2. ✍️ WRITING_ISSUE: Correct concept but poor articulation that loses marks in exams
3. ⚠️ EXAM_MISTAKE: Common exam pitfall that costs marks (e.g., incomplete answer, missing keywords, wrong structure)
4. ✅ PERFECT: Excellent answer that would score full marks

Return ONLY valid JSON without markdown.`

      const userPrompt = `Evaluate this student answer:

QUESTION: ${currentStep.question_text}
EXPECTED ANSWER: ${currentStep.correct_answer}
STUDENT ANSWER: ${user_answer}
EXAM CONTEXT: ${currentStep.exam_tag} - ${currentStep.exam_context}

OUTPUT FORMAT (return ONLY this JSON):
{
  "is_correct": true or false,
  "feedback_type": "CONCEPT_ISSUE" | "WRITING_ISSUE" | "EXAM_MISTAKE" | "PERFECT",
  "feedback_message": "Specific feedback explaining the issue or praising the answer",
  "score_percentage": 0-100,
  "improvement_tip": "Actionable tip for improvement (null if perfect)",
  "exam_relevance": "How this relates to exam scoring"
}`

      let aiResponse: { content: string; tokensUsed: { prompt: number; completion: number; total: number } }

      try {
        aiResponse = await callParallel({
          systemPrompt,
          userPrompt,
          temperature: 0.4,
          maxTokens: 800,
          jsonMode: true,
          jsonSchema: {
            name: "answer_validation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                is_correct: { type: "boolean" },
                feedback_type: { type: "string" },
                feedback_message: { type: "string" },
                score_percentage: { type: "number" },
                improvement_tip: { type: ["string", "null"] },
                exam_relevance: { type: "string" }
              },
              required: ["is_correct", "feedback_type", "feedback_message", "score_percentage", "exam_relevance"],
              additionalProperties: false
            }
          }
        })
        console.log('✅ Parallel AI validation succeeded')
      } catch (error) {
        console.error('❌ AI validation failed:', error)
        throw new Error(`AI validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Parse validation result
      const cleanedJson = aiResponse.content.trim()
        .replace(/^```json\s*/, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')

      validationResult = JSON.parse(cleanedJson)
      isCorrect = validationResult.is_correct
      feedbackType = validationResult.feedback_type

      console.log(`📊 AI Validation: ${isCorrect ? 'CORRECT' : 'INCORRECT'} (${feedbackType})`)

    } else {
      // Direct comparison for TRUE_FALSE, MCQ, ONE_WORD, STATEMENT_SELECTION, CONCEPT_SEQUENCING
      const normalizedUserAnswer = user_answer.trim().toUpperCase()
      const normalizedCorrectAnswer = currentStep.correct_answer.trim().toUpperCase()

      isCorrect = normalizedUserAnswer === normalizedCorrectAnswer

      validationResult = {
        is_correct: isCorrect,
        feedback_type: isCorrect ? 'PERFECT' : 'CONCEPT_ISSUE',
        feedback_message: isCorrect
          ? '✅ Correct! Well done.'
          : `❌ Incorrect. The correct answer is: ${currentStep.correct_answer}`,
        score_percentage: isCorrect ? 100 : 0,
        improvement_tip: isCorrect ? null : `Review the concept: ${currentStep.hint || 'Check the material again'}`,
        exam_relevance: currentStep.exam_context
      }

      console.log(`📊 Direct Validation: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`)
    }

    // Track weak areas based on feedback type
    const updatedWeakAreas = {
      concept_weak_areas: [...(session.concept_weak_areas || [])],
      writing_weak_areas: [...(session.writing_weak_areas || [])],
      exam_mistake_areas: [...(session.exam_mistake_areas || [])]
    }

    if (!isCorrect) {
      const weakAreaTopic = currentStep.question_text.substring(0, 100)

      if (feedbackType === 'CONCEPT_ISSUE') {
        updatedWeakAreas.concept_weak_areas.push(weakAreaTopic)
      } else if (feedbackType === 'WRITING_ISSUE') {
        updatedWeakAreas.writing_weak_areas.push(weakAreaTopic)
      } else if (feedbackType === 'EXAM_MISTAKE') {
        updatedWeakAreas.exam_mistake_areas.push(weakAreaTopic)
      }
    }

    // Update current step with user answer and validation
    const updatedStep: StepData = {
      ...currentStep,
      user_answer,
      validation_result: validationResult,
      answered_at: new Date().toISOString()
    }

    const updatedSteps = steps.map((s) =>
      s.step_number === step_number ? updatedStep : s
    )

    // Check if session is complete
    const isLastStep = step_number === session.total_steps
    let nextStepData: StepData | null = null
    let modelUsed = 'none'

    if (!isLastStep) {
      // Generate next step
      const nextStepNumber = step_number + 1
      const nextStepConfig = STEP_CONFIGS[nextStepNumber]

      console.log(`🎯 Generating Step ${nextStepNumber} (${nextStepConfig.type})...`)

      // Fetch note content for context
      const { data: note } = await supabase
        .from('study_notes')
        .select('title, summary, key_points, structured_content')
        .eq('id', session.note_id)
        .single()

      const contentForPrompt = `
Title: ${note?.title || 'Unknown'}
Summary: ${note?.summary || 'N/A'}
Key Points: ${Array.isArray(note?.key_points) ? note.key_points.join('\n') : 'N/A'}
Detailed Content: ${typeof note?.structured_content === 'object' ? JSON.stringify(note.structured_content) : note?.structured_content || 'N/A'}
`.trim().substring(0, 8000)

      const systemPrompt = `You are an expert Socratic teacher for Indian competitive exams.

STEP ${nextStepNumber} GUIDELINES (${nextStepConfig.type.toUpperCase()}):
${nextStepNumber === 2 || nextStepNumber === 3 || nextStepNumber === 4
  ? `- Create ANSWER_WRITING question requiring 2-3 sentence response
- Focus on ${nextStepNumber === 2 ? 'basic application' : nextStepNumber === 3 ? 'deeper analysis' : 'critical thinking'}
- Provide model answer for validation
- Tag with exam relevance`
  : nextStepNumber === 5
  ? `- Create MCQ with 4 options testing practical application
- Include plausible distractors
- Mark correct answer`
  : `- Create CONCEPT_SEQUENCING question (arrange steps/events in order)
- Test understanding of process/timeline
- Provide correct sequence`}

Return ONLY valid JSON without markdown.`

      const userPrompt = `Create Step ${nextStepNumber} question for this content:

${contentForPrompt}

PREVIOUS STEPS CONTEXT:
${updatedSteps.map((s) => `Step ${s.step_number}: ${s.question_text}`).join('\n')}

OUTPUT FORMAT (return ONLY this JSON):
{
  "step_number": ${nextStepNumber},
  "step_type": "${nextStepConfig.type}",
  "question_type": "${nextStepConfig.question_type}",
  "question_text": "Clear question",
  "correct_answer": "${nextStepConfig.question_type === 'MCQ' ? 'Correct option letter' : nextStepConfig.question_type === 'CONCEPT_SEQUENCING' ? 'Correct sequence (e.g., A,B,C,D)' : 'Model answer (2-3 sentences)'}",
  ${nextStepConfig.question_type === 'MCQ' ? '"options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],' : ''}
  ${nextStepConfig.question_type === 'CONCEPT_SEQUENCING' ? '"items_to_sequence": ["A. Item 1", "B. Item 2", "C. Item 3", "D. Item 4"],' : ''}
  "exam_tag": "Relevant exam",
  "exam_context": "Exam relevance context",
  "hint": "Optional hint"
}`

      let aiResponse: { content: string; tokensUsed: { prompt: number; completion: number; total: number } }
      modelUsed = 'parallel-speed'

      try {
        aiResponse = await callParallel({
          systemPrompt,
          userPrompt,
          temperature: 0.6,
          maxTokens: 1200,
          jsonMode: true
        })
        console.log('✅ Parallel AI step generation succeeded')
      } catch (error) {
        console.error('❌ AI step generation failed:', error)
        throw new Error(`AI step generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      const cleanedJson = aiResponse.content.trim()
        .replace(/^```json\s*/, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')

      nextStepData = JSON.parse(cleanedJson)
      if (nextStepData) {
        updatedSteps.push(nextStepData)
      }

      console.log(`✅ Step ${nextStepNumber} generated`)
    }

    // Update session
    const updateData: Record<string, unknown> = {
      steps: updatedSteps,
      current_step: isLastStep ? step_number : step_number + 1,
      ...updatedWeakAreas
    }

    if (isLastStep) {
      updateData.is_completed = true
      updateData.completed_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('teach_me_sessions')
      .update(updateData)
      .eq('id', session_id)

    if (updateError) {
      console.error('Failed to update session:', updateError)
      throw updateError
    }

    console.log('🎉 Session updated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        session_id,
        validation: validationResult,
        is_correct: isCorrect,
        is_completed: isLastStep,
        next_step: nextStepData,
        current_step: updateData.current_step,
        total_steps: session.total_steps,
        model_used: modelUsed
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in validate-teach-me-answer:', error)

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
