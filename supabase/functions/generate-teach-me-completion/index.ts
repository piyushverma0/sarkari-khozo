// Generate Teach Me Completion - Analyze completed session and create revision plan
// Uses AI to generate exam risk analysis and 3-minute revision plan
// Provides actionable insights for exam preparation

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

interface GenerateCompletionRequest {
  session_id: string
  user_id: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id, user_id }: GenerateCompletionRequest = await req.json()

    if (!session_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'session_id and user_id are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🎓 Generating completion summary for session:', session_id)

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

    if (!session.is_completed) {
      return new Response(
        JSON.stringify({ error: 'Session is not yet completed' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('📚 Session fetched, analyzing performance...')

    // Fetch note for context
    const { data: note } = await supabase
      .from('study_notes')
      .select('title, summary')
      .eq('id', session.note_id)
      .single()

    // Analyze steps and performance
    const steps = session.steps || []
    const totalSteps = steps.length
    const correctAnswers = steps.filter((s: any) =>
      s.validation_result?.is_correct === true
    ).length

    const conceptIssues = steps.filter((s: any) =>
      s.validation_result?.feedback_type === 'CONCEPT_ISSUE'
    ).length

    const writingIssues = steps.filter((s: any) =>
      s.validation_result?.feedback_type === 'WRITING_ISSUE'
    ).length

    const examMistakes = steps.filter((s: any) =>
      s.validation_result?.feedback_type === 'EXAM_MISTAKE'
    ).length

    console.log(`📊 Performance: ${correctAnswers}/${totalSteps} correct`)
    console.log(`🧠 Concept issues: ${conceptIssues}, ✍️ Writing issues: ${writingIssues}, ⚠️ Exam mistakes: ${examMistakes}`)

    // Build analysis context for AI
    const performanceContext = `
Session Performance:
- Topic: ${note?.title || 'Unknown'}
- Total Steps: ${totalSteps}
- Correct Answers: ${correctAnswers}
- Accuracy: ${Math.round((correctAnswers / totalSteps) * 100)}%

Issue Breakdown:
- 🧠 Concept Issues: ${conceptIssues} (${session.concept_weak_areas.length} unique areas)
- ✍️ Writing Issues: ${writingIssues} (${session.writing_weak_areas.length} unique areas)
- ⚠️ Exam Mistakes: ${examMistakes} (${session.exam_mistake_areas.length} unique areas)

Weak Areas:
Concept: ${session.concept_weak_areas.slice(0, 3).join('; ') || 'None'}
Writing: ${session.writing_weak_areas.slice(0, 3).join('; ') || 'None'}
Exam: ${session.exam_mistake_areas.slice(0, 3).join('; ') || 'None'}

Exam Tags: ${session.exam_tags.join(', ')}

Step-by-Step Performance:
${steps.map((s: any) => `
Step ${s.step_number} (${s.question_type}):
Q: ${s.question_text.substring(0, 100)}...
User Answer: ${s.user_answer || 'N/A'}
Result: ${s.validation_result?.is_correct ? '✅ Correct' : '❌ Incorrect'}
Feedback: ${s.validation_result?.feedback_type || 'N/A'}
`).join('\n')}
`.trim()

    const systemPrompt = `You are an expert exam coach for Indian competitive exams. Analyze student performance and create actionable revision plans.

FOCUS ON:
1. Exam Risk Areas: Identify HIGH/MEDIUM/LOW risk areas with quick fixes
2. 3-Minute Revision Plan: Ultra-focused actionable steps
3. Performance Breakdown: Clear metrics for concept/writing/exam readiness

Return ONLY valid JSON without markdown.`

    const userPrompt = `Analyze this Teach Me session and create a completion summary:

${performanceContext}

OUTPUT FORMAT (return ONLY this JSON):
{
  "exam_risk_areas": [
    {
      "risk_level": "HIGH" | "MEDIUM" | "LOW",
      "area": "Specific weak area",
      "issue_type": "CONCEPT_ISSUE" | "WRITING_ISSUE" | "EXAM_MISTAKE",
      "quick_fix": "Actionable 1-sentence fix",
      "exam_impact": "How this affects exam scoring"
    }
  ],
  "revision_plan_3min": {
    "step_1": "First thing to revise (30 sec)",
    "step_2": "Second thing to revise (60 sec)",
    "step_3": "Third thing to revise (90 sec)",
    "key_formula_or_fact": "One critical thing to memorize"
  },
  "performance_breakdown": {
    "concept_understanding": 0-100,
    "writing_quality": 0-100,
    "exam_readiness": 0-100,
    "overall_score": 0-100,
    "strengths": ["Strength 1", "Strength 2"],
    "priority_improvements": ["Improvement 1", "Improvement 2"]
  },
  "motivational_message": "Encouraging 1-2 sentence message"
}

IMPORTANT:
- Prioritize HIGH risk areas (those that will cost the most marks)
- Make revision plan ultra-specific and time-bound
- Focus on quick wins for exam preparation
- Be honest but encouraging`

    console.log('🤖 Calling AI for completion analysis...')

    let aiResponse: any
    let modelUsed = 'parallel-speed'

    try {
      aiResponse = await callParallel({
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 2000,
        jsonMode: true,
        jsonSchema: {
          name: "completion_summary",
          strict: true,
          schema: {
            type: "object",
            properties: {
              exam_risk_areas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    risk_level: { type: "string" },
                    area: { type: "string" },
                    issue_type: { type: "string" },
                    quick_fix: { type: "string" },
                    exam_impact: { type: "string" }
                  },
                  required: ["risk_level", "area", "issue_type", "quick_fix", "exam_impact"],
                  additionalProperties: false
                }
              },
              revision_plan_3min: {
                type: "object",
                properties: {
                  step_1: { type: "string" },
                  step_2: { type: "string" },
                  step_3: { type: "string" },
                  key_formula_or_fact: { type: "string" }
                },
                required: ["step_1", "step_2", "step_3", "key_formula_or_fact"],
                additionalProperties: false
              },
              performance_breakdown: {
                type: "object",
                properties: {
                  concept_understanding: { type: "number" },
                  writing_quality: { type: "number" },
                  exam_readiness: { type: "number" },
                  overall_score: { type: "number" },
                  strengths: {
                    type: "array",
                    items: { type: "string" }
                  },
                  priority_improvements: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["concept_understanding", "writing_quality", "exam_readiness", "overall_score", "strengths", "priority_improvements"],
                additionalProperties: false
              },
              motivational_message: { type: "string" }
            },
            required: ["exam_risk_areas", "revision_plan_3min", "performance_breakdown", "motivational_message"],
            additionalProperties: false
          }
        }
      })
      console.log('✅ Parallel AI completion analysis succeeded')
    } catch (parallelError: unknown) {
      console.log('⚠️ Parallel AI failed, falling back:', parallelError instanceof Error ? parallelError.message : 'Unknown error')

      const fallbackResponse = await callAI({
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 2000,
        responseFormat: 'json'
      })

      aiResponse = {
        content: fallbackResponse.content,
        tokensUsed: fallbackResponse.tokensUsed
      }
      modelUsed = fallbackResponse.modelUsed || 'fallback-ai'
      console.log(`✅ Fallback AI completion analysis succeeded with model: ${modelUsed}`)
    }

    // Parse completion summary
    const cleanedJson = aiResponse.content.trim()
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')

    const completionSummary = JSON.parse(cleanedJson)

    console.log('✅ Completion summary generated')

    // Update session with completion data
    const { error: updateError } = await supabase
      .from('teach_me_sessions')
      .update({
        exam_risk_areas: completionSummary.exam_risk_areas,
        recommended_revision: completionSummary.revision_plan_3min,
        performance_breakdown: completionSummary.performance_breakdown
      })
      .eq('id', session_id)

    if (updateError) {
      console.error('Failed to update session with completion data:', updateError)
      throw updateError
    }

    console.log('🎉 Session updated with completion summary')

    return new Response(
      JSON.stringify({
        success: true,
        session_id,
        completion_summary: completionSummary,
        stats: {
          total_steps: totalSteps,
          correct_answers: correctAnswers,
          accuracy_percentage: Math.round((correctAnswers / totalSteps) * 100),
          concept_issues: conceptIssues,
          writing_issues: writingIssues,
          exam_mistakes: examMistakes
        },
        model_used: modelUsed
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: unknown) {
    console.error('❌ Error in generate-teach-me-completion:', error)

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
