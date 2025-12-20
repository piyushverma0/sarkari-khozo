// Generate Next Socratic Question - Dynamic question generation based on student responses
// Analyzes understanding, generates probing questions, and decides conversation flow
// Core of the Socratic teaching system

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

interface GenerateQuestionRequest {
  session_id: string
  user_answer: string
  user_id: string
}

interface ConversationTurn {
  turn_number: number
  speaker: 'AI' | 'STUDENT'
  message: string
  type: string
  timestamp: string
  question_type?: string
  validation_result?: Record<string, unknown>
}

interface Concept {
  concept_number: number
  concept_name: string
  concept_difficulty: string
  conversation_turns: ConversationTurn[]
  is_mastered: boolean
  understanding_score: number
  attempts: number
  misconceptions_identified: string[]
  time_spent_seconds: number
  probing_questions_asked: number
  exam_tag?: string
  exam_context?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id, user_answer, user_id }: GenerateQuestionRequest = await req.json()

    if (!session_id || !user_answer || !user_id) {
      return new Response(
        JSON.stringify({ error: 'session_id, user_answer, and user_id are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🤔 Generating next Socratic question for session:', session_id)

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

    console.log('📚 Session fetched, analyzing student response...')

    // Get current concept
    const concepts = session.concepts || []
    const currentConceptIndex = session.current_concept_index || 0
    const currentConcept: Concept = concepts[currentConceptIndex]

    if (!currentConcept) {
      throw new Error('Current concept not found')
    }

    // Get current conversation
    const currentConversation: ConversationTurn[] = session.current_conversation || []
    const lastAITurn = currentConversation.filter(t => t.speaker === 'AI').pop()

    console.log(`📖 Concept: "${currentConcept.concept_name}" (Turn ${currentConversation.length + 1})`)

    // ========================================================================
    // STEP 1: Analyze Student Understanding
    // ========================================================================

    const analysisPrompt = `You are an expert educational psychologist analyzing student responses for Socratic teaching.

STUDENT'S ANSWER: "${user_answer}"

QUESTION ASKED: "${lastAITurn?.message || 'Opening question'}"

CONCEPT BEING TAUGHT: "${currentConcept.concept_name}"

CONVERSATION HISTORY:
${currentConversation.map(t => `${t.speaker}: ${t.message}`).join('\n')}

PREVIOUS ATTEMPTS: ${currentConcept.attempts}
CURRENT UNDERSTANDING SCORE: ${currentConcept.understanding_score}/100

Analyze this student response and return ONLY valid JSON:

{
  "understanding_demonstrated": "none" | "partial" | "good" | "excellent",
  "reasoning_quality": "weak" | "moderate" | "strong",
  "misconceptions_detected": ["list of specific misconceptions"],
  "needs_probing": true/false,
  "needs_scaffolding": true/false,
  "concept_grasped": true/false,
  "key_insight": "What the student understands or misunderstands",
  "recommended_action": "PROBE" | "CHALLENGE" | "SCAFFOLD" | "VALIDATE" | "MOVE_ON"
}`

    console.log('🤖 Analyzing understanding with AI...')

    let analysisResponse: { content: string }
    try {
      analysisResponse = await callParallel({
        systemPrompt: 'You are an expert educational psychologist. Return ONLY valid JSON.',
        userPrompt: analysisPrompt,
        temperature: 0.3,
        maxTokens: 500,
        jsonMode: true
      })
    } catch (err: unknown) {
      console.log('⚠️ Parallel failed, using fallback:', err instanceof Error ? err.message : 'Unknown error')
      const fallback = await callAI({
        systemPrompt: 'You are an expert educational psychologist. Return ONLY valid JSON.',
        userPrompt: analysisPrompt,
        temperature: 0.3,
        maxTokens: 500,
        responseFormat: 'json'
      })
      analysisResponse = { content: fallback.content }
    }

    const cleanedAnalysis = analysisResponse.content.trim()
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')

    const analysis = JSON.parse(cleanedAnalysis)

    console.log(`📊 Analysis: ${analysis.understanding_demonstrated} understanding, ${analysis.reasoning_quality} reasoning`)
    console.log(`💡 Key insight: ${analysis.key_insight}`)
    console.log(`🎯 Recommended action: ${analysis.recommended_action}`)

    // ========================================================================
    // STEP 2: Decide Next Action
    // ========================================================================

    let nextAction = analysis.recommended_action
    let nextQuestion = ''
    let nextQuestionType: string | null = ''
    let turnType = ''
    let conceptMastered = false
    let moveToNextConcept = false

    // Update understanding score
    const understandingScoreDelta: Record<string, number> = {
      'none': -10,
      'partial': 5,
      'good': 15,
      'excellent': 25
    }

    const newUnderstandingScore = Math.max(0, Math.min(100,
      currentConcept.understanding_score + (understandingScoreDelta[analysis.understanding_demonstrated] || 0)
    ))

    // Check if concept is mastered
    if (analysis.concept_grasped && newUnderstandingScore >= 80) {
      conceptMastered = true
      moveToNextConcept = currentConceptIndex < session.total_concepts - 1
      nextAction = 'MOVE_ON'
    }

    // ========================================================================
    // STEP 3: Generate Next Question Based on Action
    // ========================================================================

    if (nextAction === 'MOVE_ON' && conceptMastered) {
      // Congratulate and prepare for next concept
      nextQuestion = `Excellent! You've truly grasped ${currentConcept.concept_name}. `
      nextQuestion += moveToNextConcept
        ? `Let's move on to our next concept.`
        : `You've completed all concepts! Let me prepare your summary.`
      turnType = 'VALIDATION'
      nextQuestionType = null

    } else if (nextAction === 'SCAFFOLD' || analysis.needs_scaffolding) {
      // Provide scaffolding for struggling students
      const scaffoldPrompt = `Generate a SCAFFOLDING question for a struggling student.

CONCEPT: "${currentConcept.concept_name}"
STUDENT'S STRUGGLE: "${analysis.key_insight}"
STUDENT'S ANSWER: "${user_answer}"

Create a simpler, guiding question that:
- Breaks down the concept into smaller parts
- Provides hints without giving away the answer
- Uses analogy or real-world examples
- Builds confidence

Return ONLY the question text, no JSON, no explanation.`

      const scaffoldResponse = await callAI({
        systemPrompt: 'You are a patient Socratic teacher. Generate ONE scaffolding question.',
        userPrompt: scaffoldPrompt,
        temperature: 0.7,
        maxTokens: 200
      })

      nextQuestion = scaffoldResponse.content.trim().replace(/^"|"$/g, '')
      turnType = 'SCAFFOLDING'
      nextQuestionType = 'SIMPLIFYING'

    } else if (nextAction === 'CHALLENGE' || analysis.misconceptions_detected.length > 0) {
      // Challenge misconception
      const misconception = analysis.misconceptions_detected[0] || analysis.key_insight

      const challengePrompt = `Generate a CHALLENGING question to address this misconception.

CONCEPT: "${currentConcept.concept_name}"
MISCONCEPTION: "${misconception}"
STUDENT'S ANSWER: "${user_answer}"

Create a thought-provoking question that:
- Gently challenges the misconception
- Encourages the student to reconsider
- Uses Socratic method (e.g., "What if...", "Can you think of...")
- Doesn't directly state the error

Return ONLY the question text, no JSON, no explanation.`

      const challengeResponse = await callAI({
        systemPrompt: 'You are a Socratic teacher. Generate ONE challenging question.',
        userPrompt: challengePrompt,
        temperature: 0.7,
        maxTokens: 200
      })

      nextQuestion = challengeResponse.content.trim().replace(/^"|"$/g, '')
      turnType = 'CHALLENGE'
      nextQuestionType = 'WHAT_IF'

    } else if (nextAction === 'PROBE' || analysis.needs_probing) {
      // Probe for deeper understanding
      const probePrompt = `Generate a PROBING question to deepen understanding.

CONCEPT: "${currentConcept.concept_name}"
STUDENT'S CURRENT UNDERSTANDING: "${analysis.key_insight}"
STUDENT'S ANSWER: "${user_answer}"

Create a probing question that:
- Asks "Why?" or "How?" to reveal reasoning
- Encourages explanation of their thinking
- Connects to exam relevance: ${currentConcept.exam_context || 'competitive exams'}
- Deepens conceptual understanding

Return ONLY the question text, no JSON, no explanation.`

      const probeResponse = await callAI({
        systemPrompt: 'You are a Socratic teacher. Generate ONE probing question.',
        userPrompt: probePrompt,
        temperature: 0.7,
        maxTokens: 200
      })

      nextQuestion = probeResponse.content.trim().replace(/^"|"$/g, '')
      turnType = 'PROBING_QUESTION'
      nextQuestionType = analysis.understanding_demonstrated === 'partial' ? 'WHY' : 'HOW'

    } else {
      // Default: Validate and ask follow-up
      nextQuestion = `Good! Can you explain your reasoning behind that answer?`
      turnType = 'PROBING_QUESTION'
      nextQuestionType = 'EXPLAIN'
    }

    console.log(`🎭 Next action: ${nextAction}, Turn type: ${turnType}`)

    // ========================================================================
    // STEP 4: Update Session with Conversation Turns
    // ========================================================================

    const nextTurnNumber = currentConversation.length + 1

    // Add student's turn
    const studentTurn: ConversationTurn = {
      turn_number: nextTurnNumber,
      speaker: 'STUDENT',
      message: user_answer,
      type: 'ANSWER',
      timestamp: new Date().toISOString(),
      validation_result: {
        understanding_demonstrated: analysis.understanding_demonstrated,
        reasoning_quality: analysis.reasoning_quality,
        misconceptions_detected: analysis.misconceptions_detected,
        needs_probing: analysis.needs_probing,
        needs_scaffolding: analysis.needs_scaffolding,
        concept_grasped: analysis.concept_grasped
      }
    }

    // Add AI's turn
    const aiTurn: ConversationTurn = {
      turn_number: nextTurnNumber + 1,
      speaker: 'AI',
      message: nextQuestion,
      type: turnType,
      timestamp: new Date().toISOString(),
      question_type: nextQuestionType || undefined
    }

    const updatedConversation = [...currentConversation, studentTurn, aiTurn]

    // Update concept
    const updatedConcept: Concept = {
      ...currentConcept,
      conversation_turns: updatedConversation,
      is_mastered: conceptMastered,
      understanding_score: newUnderstandingScore,
      attempts: currentConcept.attempts + 1,
      misconceptions_identified: [
        ...currentConcept.misconceptions_identified,
        ...analysis.misconceptions_detected
      ],
      probing_questions_asked: turnType.includes('PROB') || turnType.includes('CHALLENGE')
        ? currentConcept.probing_questions_asked + 1
        : currentConcept.probing_questions_asked
    }

    // Update concepts array
    const updatedConcepts = concepts.map((c: Concept, idx: number) =>
      idx === currentConceptIndex ? updatedConcept : c
    )

    // Prepare database update
    const updatePayload: Record<string, unknown> = {
      current_conversation: updatedConversation,
      concepts: updatedConcepts,
      total_conversation_turns: session.total_conversation_turns + 2,
      updated_at: new Date().toISOString()
    }

    // If concept mastered, move to next
    if (moveToNextConcept) {
      updatePayload.current_concept_index = currentConceptIndex + 1
      updatePayload.concepts_mastered = session.concepts_mastered + 1
      updatePayload.current_conversation = [] // Reset for new concept
      console.log(`✅ Concept mastered! Moving to concept ${currentConceptIndex + 2}`)
    } else if (conceptMastered && !moveToNextConcept) {
      // All concepts completed
      updatePayload.is_completed = true
      updatePayload.completed_at = new Date().toISOString()
      updatePayload.concepts_mastered = session.concepts_mastered + 1
      console.log(`🎉 All concepts mastered! Session complete.`)
    }

    // Update misconceptions list
    if (analysis.misconceptions_detected.length > 0) {
      const newMisconceptions = analysis.misconceptions_detected.map((m: string) => ({
        concept: currentConcept.concept_name,
        misconception: m,
        identified_at: new Date().toISOString(),
        resolved: false
      }))
      updatePayload.misconceptions = [...(session.misconceptions || []), ...newMisconceptions]
    }

    // Update session in database
    const { error: updateError } = await supabase
      .from('teach_me_sessions')
      .update(updatePayload)
      .eq('id', session_id)
      .eq('user_id', user_id)

    if (updateError) {
      console.error('Failed to update session:', updateError)
      throw updateError
    }

    console.log(`💾 Session updated successfully`)

    // ========================================================================
    // STEP 5: Return Response
    // ========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        next_question: nextQuestion,
        turn_type: turnType,
        question_type: nextQuestionType,
        understanding_analysis: {
          level: analysis.understanding_demonstrated,
          reasoning: analysis.reasoning_quality,
          score: newUnderstandingScore,
          misconceptions: analysis.misconceptions_detected
        },
        concept_status: {
          is_mastered: conceptMastered,
          move_to_next: moveToNextConcept,
          current_concept: currentConcept.concept_name,
          attempts: updatedConcept.attempts,
          understanding_score: newUnderstandingScore
        },
        session_status: {
          current_concept_index: moveToNextConcept ? currentConceptIndex + 1 : currentConceptIndex,
          total_concepts: session.total_concepts,
          concepts_mastered: moveToNextConcept ? session.concepts_mastered + 1 : session.concepts_mastered,
          is_completed: updatePayload.is_completed || false,
          total_turns: session.total_conversation_turns + 2
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: unknown) {
    console.error('❌ Error in generate-next-socratic-question:', error)

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
