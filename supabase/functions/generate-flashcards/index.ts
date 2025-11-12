import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get user
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { note_id } = await req.json()

    console.log(`Generating flashcards for note ${note_id}`)

    // Fetch note content
    const { data: note, error: fetchError } = await supabaseClient
      .from('study_notes')
      .select('structured_content, title, raw_content')
      .eq('id', note_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !note) throw new Error('Note not found')

    const content = note.structured_content || note.raw_content

    const prompt = `Create 15-20 high-quality flashcards from these study notes for exam preparation.

REQUIREMENTS:
- Mix difficulty levels: 5 easy, 10 medium, 5 hard
- Cover all key concepts and facts
- Questions should be clear, specific, and exam-focused
- Answers should be concise but complete (2-3 sentences max)
- Include helpful hints when appropriate
- Categorize by topic (e.g., "Eligibility", "Important Dates", "Process", "General Knowledge")
- Focus on recall-type questions (What, When, Who, How many)

OUTPUT FORMAT: Return ONLY valid JSON (no markdown):
{
  "flashcards": [
    {
      "question": "What is the age limit for this exam?",
      "answer": "21-30 years for general category, with relaxation for OBC/SC/ST",
      "hint": "Think about different category relaxations",
      "category": "Eligibility",
      "difficulty": "easy"
    }
  ]
}

NOTES TITLE: ${note.title}

NOTES CONTENT:
${JSON.stringify(content).substring(0, 30000)}
`

    console.log('Calling Claude AI for flashcard generation')

    // Use direct API call to Claude
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`)
    }

    const claudeData = await claudeResponse.json()
    const responseText = claudeData.content?.[0]?.text || '{}'
    
    const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const { flashcards } = JSON.parse(cleanedResponse)

    if (!flashcards || flashcards.length === 0) {
      throw new Error('No flashcards generated')
    }

    console.log(`Generated ${flashcards.length} flashcards, inserting into database`)

    // Insert flashcards
    const flashcardsToInsert = flashcards.map((fc: any) => ({
      note_id,
      user_id: user.id,
      question: fc.question,
      answer: fc.answer,
      hint: fc.hint || null,
      category: fc.category || 'General',
      difficulty: fc.difficulty || 'medium',
      ease_factor: 2.5,
      interval: 0,
      repetitions: 0,
      next_review_date: null
    }))

    const { error: insertError } = await supabaseClient
      .from('note_flashcards')
      .insert(flashcardsToInsert)

    if (insertError) throw insertError

    // Update note flag
    await supabaseClient
      .from('study_notes')
      .update({ has_flashcards: true })
      .eq('id', note_id)

    console.log(`Successfully created ${flashcards.length} flashcards for note ${note_id}`)

    return new Response(
      JSON.stringify({ success: true, count: flashcards.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Flashcard generation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})