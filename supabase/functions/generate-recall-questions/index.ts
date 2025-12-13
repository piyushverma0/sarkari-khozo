// Generate Recall Questions - Create active brain testing questions from notes
// Uses AI to insert periodic questions between paragraphs for active recall

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { callAI, logAIUsage } from '../_shared/ai-client.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateRecallQuestionsRequest {
  note_id: string
  structured_content: {
    sections: Array<{
      title: string
      content: string
      subsections?: any[]
    }>
  }
  max_questions_per_section?: number
}

interface RecallQuestionResponse {
  id: string
  type: 'fill_blank' | 'true_false' | 'mcq' | 'connect_dots'
  section_id: string | null       // snake_case for Kotlin @SerialName
  after_paragraph: number         // snake_case for Kotlin @SerialName
  question: string
  options: string[] | null
  correct_answer: string          // snake_case for Kotlin @SerialName
  explanation: string
  related_concept: string         // snake_case for Kotlin @SerialName
  difficulty: 'easy' | 'medium' | 'hard'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { note_id, structured_content, max_questions_per_section = 3 }: GenerateRecallQuestionsRequest = await req.json()

    if (!note_id || !structured_content || !structured_content.sections) {
      return new Response(
        JSON.stringify({ error: 'note_id and structured_content.sections are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Generating recall questions for note:', note_id)
    console.log('Sections count:', structured_content.sections.length)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Generate questions for each section
    const allQuestions: RecallQuestionResponse[] = []

    for (const section of structured_content.sections) {
      if (!section.content || section.content.trim().length < 100) {
        console.log('Skipping section with insufficient content:', section.title)
        continue
      }

      console.log('Processing section:', section.title)

      // Build AI prompt for this section
      const systemPrompt = buildRecallQuestionPrompt(section, max_questions_per_section)

      try {
        const aiResponse = await callAI({
          systemPrompt,
          userPrompt: `Section: ${section.title}\n\n${section.content.substring(0, 10000)}`,
          temperature: 0.5,
          maxTokens: 4096,
          responseFormat: 'json'
        })

        logAIUsage('generate-recall-questions', aiResponse.tokensUsed, aiResponse.webSearchUsed, aiResponse.modelUsed)

        // Parse AI response
        let responseText = aiResponse.content.trim()

        // Clean up response
        if (responseText.startsWith('```json')) {
          responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (responseText.startsWith('```')) {
          responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }

        const parsedResponse = JSON.parse(responseText)
        const sectionQuestions = parsedResponse.questions || []

        // Add section context and generate IDs
        // Convert camelCase from AI response to snake_case for Kotlin
        sectionQuestions.forEach((q: any, index: number) => {
          allQuestions.push({
            id: `${note_id}_${section.title.replace(/\s+/g, '_')}_q${index + 1}`,
            type: q.type,
            section_id: section.title,
            after_paragraph: q.afterParagraph ?? q.after_paragraph ?? 0,
            question: q.question,
            options: q.options,
            correct_answer: q.correctAnswer ?? q.correct_answer ?? '',
            explanation: q.explanation ?? '',
            related_concept: q.relatedConcept ?? q.related_concept ?? '',
            difficulty: q.difficulty ?? 'medium'
          })
        })

        console.log(`Generated ${sectionQuestions.length} questions for section: ${section.title}`)

      } catch (sectionError) {
        console.error(`Failed to generate questions for section ${section.title}:`, sectionError)
        // Continue with next section
      }
    }

    console.log(`Total questions generated: ${allQuestions.length}`)

    // Store questions in database
    const { error: updateError } = await supabase
      .from('study_notes')
      .update({
        recall_questions: allQuestions,
        has_recall_questions: allQuestions.length > 0,
        recall_questions_generated_at: new Date().toISOString()
      })
      .eq('id', note_id)

    if (updateError) {
      console.error('Failed to update note with recall questions:', updateError)
      throw updateError
    }

    console.log('Recall questions stored successfully')

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        questions_count: allQuestions.length,
        sections_processed: structured_content.sections.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Error in generate-recall-questions:', error)

    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Build AI prompt for generating recall questions
 */
function buildRecallQuestionPrompt(section: any, maxQuestions: number): string {
  return `You are an expert educator specializing in active recall techniques for exam preparation.

Analyze the following section and generate strategic recall questions to test comprehension.

PLACEMENT RULES:
- Generate ${maxQuestions} questions maximum for this section
- Space questions evenly (every 2-3 paragraphs)
- Place questions AFTER key concepts are explained
- Questions must test UNDERSTANDING, not just memorization

QUESTION TYPE SELECTION (AI decides):

1. **Fill-in-the-Blanks**:
   - Use for: Specific facts, numbers, names, dates, definitions
   - Provide 4 confusing options (including correct answer)
   - Options should be similar/related to make it challenging
   - Example: "The _____ Amendment deals with Panchayati Raj"
     Options: ["72nd", "73rd", "74th", "75th"]

2. **True/False**:
   - Use for: Testing common misconceptions, verifying understanding
   - Include clear explanation of why it's true or false
   - Example: "The 73rd Amendment is related to urban governance. (T/F)"

3. **Multiple Choice (MCQ)**:
   - Use for: Testing concept understanding with nuanced differences
   - Provide 4 options with plausible distractors
   - Options should test depth of understanding
   - Example: "Which article guarantees equality before law?"
     Options: ["Article 14", "Article 19", "Article 21", "Article 32"]

4. **Connect-the-Dots**:
   - Use for: Testing relationships between concepts
   - Provide items to match (4 pairs)
   - Example: Match amendments with their focus:
     Options: ["73rd - Panchayati Raj", "74th - Urban Bodies", "42nd - Fundamental Duties", "44th - Right to Property"]

QUALITY RULES:
- Question MUST be answerable from the paragraph immediately above it
- For fill-in-blanks: 4 options that are confusingly similar
- For MCQ: 4 options where distractors are plausible
- Explanation should reference specific content from the paragraph
- Difficulty should match content complexity:
  - Easy: Direct recall from text
  - Medium: Requires understanding/inference
  - Hard: Requires connecting multiple concepts

PARAGRAPH DETECTION:
- Split content by double newlines (\\n\\n) or markdown headings
- Number paragraphs starting from 0
- Specify "after_paragraph" index where question should appear

OUTPUT FORMAT (JSON only, no markdown):
{
  "questions": [
    {
      "after_paragraph": 2,
      "type": "fill_blank" | "true_false" | "mcq" | "connect_dots",
      "question": "The _____ Amendment introduced Panchayati Raj system",
      "options": ["72nd", "73rd", "74th", "75th"],
      "correct_answer": "73rd",
      "explanation": "As stated in the previous paragraph, the 73rd Amendment Act of 1992 gave constitutional status to Panchayati Raj institutions.",
      "related_concept": "Constitutional Amendments",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON
- Use snake_case for all field names (after_paragraph, correct_answer, related_concept)
- Ensure "options" is always an array for fill_blank, mcq, connect_dots
- For true_false, set "options" to null
- Generate questions that genuinely test understanding
- Avoid trivial or too obvious questions`
}
