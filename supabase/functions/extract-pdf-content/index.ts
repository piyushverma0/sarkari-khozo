import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'

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

    const { note_id, source_url, language } = await req.json()

    console.log(`Starting PDF extraction for note ${note_id}`)

    // Update status
    await supabaseClient
      .from('study_notes')
      .update({ processing_status: 'extracting', processing_progress: 10 })
      .eq('id', note_id)

    console.log(`Extracting PDF content from ${source_url}`)

    // Download PDF
    const pdfResponse = await fetch(source_url)
    if (!pdfResponse.ok) throw new Error('Failed to download PDF')
    
    const pdfBlob = await pdfResponse.blob()
    const pdfBuffer = await pdfBlob.arrayBuffer()
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)))

    console.log(`PDF downloaded, size: ${pdfBuffer.byteLength} bytes`)

    // Use Claude vision to extract text
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')
    })

    await supabaseClient
      .from('study_notes')
      .update({ processing_progress: 30 })
      .eq('id', note_id)

    console.log('Calling Claude API for text extraction')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64PDF
            }
          },
          {
            type: 'text',
            text: `Extract ALL text from this PDF document. Preserve:
- Headings and structure
- Important dates and deadlines
- Lists and bullet points
- Tables (convert to readable format)
- Contact information and URLs

Output the extracted text in a clean, readable format.`
          }
        ]
      }]
    })

    const extractedText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log(`Text extracted, length: ${extractedText.length} characters`)

    // Save raw content
    await supabaseClient
      .from('study_notes')
      .update({ 
        raw_content: extractedText,
        processing_progress: 50,
        word_count: extractedText.split(/\s+/).length,
        estimated_read_time: Math.ceil(extractedText.split(/\s+/).length / 200)
      })
      .eq('id', note_id)

    console.log('Triggering summarization')

    // Trigger summarization
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-notes-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      },
      body: JSON.stringify({ note_id, raw_content: extractedText, language })
    }).catch(err => console.error('Summarization trigger error:', err))

    return new Response(
      JSON.stringify({ success: true, extracted_length: extractedText.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('PDF extraction error:', error)
    
    // Update note with error
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
          processing_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', note_id)
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
