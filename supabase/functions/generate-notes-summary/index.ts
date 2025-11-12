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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { note_id, raw_content, language } = await req.json()

    console.log(`Starting summarization for note ${note_id}`)

    // Update status
    await supabaseClient
      .from('study_notes')
      .update({ processing_status: 'summarizing', processing_progress: 60 })
      .eq('id', note_id)

    const prompt = `You are an expert study assistant helping students prepare for government exams in India (UPSC, SSC, Banking, Railway, etc.).

Transform the following text into clean, well-structured study notes optimized for exam preparation.

REQUIREMENTS:
1. Create clear sections with descriptive headings
2. Extract key points as concise bullet lists
3. Identify and highlight:
   - Important dates and deadlines (use ISO format YYYY-MM-DD)
   - Eligibility criteria
   - Fee structure
   - Application process steps
   - Contact information
4. Create a 2-3 sentence summary
5. Preserve all critical information (dates, numbers, requirements)
6. Format for easy scanning and comprehension
7. If URLs are present, include them with descriptive text

OUTPUT FORMAT: Return ONLY valid JSON in this exact structure (no markdown, no backticks):
{
  "title": "Auto-generated descriptive title",
  "summary": "2-3 sentence summary highlighting most important info",
  "key_points": ["Key point 1", "Key point 2", "Key point 3"],
  "sections": [
    {
      "title": "Section Title",
      "content": "Section content with full details",
      "subsections": [
        {
          "title": "Subsection Title",
          "content": "Subsection content"
        }
      ],
      "highlights": ["Important date: 2025-02-15", "Last date: 2025-03-01"],
      "links": [
        {"text": "Apply Online", "url": "https://example.com/apply", "type": "application"},
        {"text": "Official Notification", "url": "https://example.com/pdf", "type": "external"}
      ]
    }
  ]
}

TEXT TO PROCESS:
${raw_content.substring(0, 50000)}
`

    console.log('Calling Claude AI for summarization')

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
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`)
    }

    const claudeData = await claudeResponse.json()
    const responseText = claudeData.content?.[0]?.text || '{}'

    await supabaseClient
      .from('study_notes')
      .update({ processing_progress: 80 })
      .eq('id', note_id)

    console.log('Parsing structured content from Claude response')

    // Clean response (remove markdown code blocks if present)
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const structuredContent = JSON.parse(cleanedResponse)

    // Calculate metadata
    const wordCount = raw_content.split(/\s+/).length
    const estimatedReadTime = Math.ceil(wordCount / 200) // ~200 words per minute

    console.log(`Updating note with structured content: ${structuredContent.title}`)

    // Update note with structured content
    const { error: updateError } = await supabaseClient
      .from('study_notes')
      .update({
        title: structuredContent.title || 'Untitled Note',
        summary: structuredContent.summary,
        key_points: structuredContent.key_points || [],
        structured_content: { sections: structuredContent.sections || [] },
        word_count: wordCount,
        estimated_read_time: estimatedReadTime,
        processing_status: 'completed',
        processing_progress: 100
      })
      .eq('id', note_id)

    if (updateError) throw updateError

    console.log(`Successfully processed note ${note_id}`)

    return new Response(
      JSON.stringify({ success: true, note_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Summarization error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    try {
      const body = await req.json().catch(() => ({}))
      const note_id = body.note_id
      
      if (note_id) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        await supabaseClient
          .from('study_notes')
          .update({ 
            processing_status: 'failed',
            processing_error: errorMessage
          })
          .eq('id', note_id)
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError)
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})