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

    await supabaseClient
      .from('study_notes')
      .update({ processing_progress: 30 })
      .eq('id', note_id)

    console.log('Calling Lovable AI (Gemini) for text extraction')

    // Use Lovable AI with Gemini for PDF extraction
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract ALL text from this PDF document. Preserve:
- Headings and structure
- Important dates and deadlines  
- Lists and bullet points
- Tables (convert to readable format)
- Contact information and URLs

Output the extracted text in a clean, readable format.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64PDF}`
                }
              }
            ]
          }
        ]
      })
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`)
    }

    const aiData = await aiResponse.json()
    const extractedText = aiData.choices?.[0]?.message?.content || ''
    
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
