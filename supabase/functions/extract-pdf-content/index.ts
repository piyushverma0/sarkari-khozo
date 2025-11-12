import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.0'

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

    // Update status
    await supabaseClient
      .from('study_notes')
      .update({ processing_status: 'extracting', processing_progress: 10 })
      .eq('id', note_id)

    console.log(`Extracting PDF content from ${source_url}`)

    // Download PDF
    const pdfResponse = await fetch(source_url)
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`)
    }

    const pdfBlob = await pdfResponse.blob()
    const pdfBuffer = await pdfBlob.arrayBuffer()
    
    // Check PDF size (max 32MB as per Claude limits)
    const sizeInMB = pdfBuffer.byteLength / (1024 * 1024)
    if (sizeInMB > 32) {
      throw new Error(`PDF too large: ${sizeInMB.toFixed(2)}MB. Maximum size is 32MB.`)
    }
    
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)))

    console.log(`PDF downloaded: ${sizeInMB.toFixed(2)}MB, starting extraction...`)

    // Use Claude's native PDF support
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')
    })

    await supabaseClient
      .from('study_notes')
      .update({ processing_progress: 30 })
      .eq('id', note_id)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
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
            text: `Extract ALL text content from this PDF document. This appears to be an educational/government document (exam notification, syllabus, or study material).

EXTRACTION REQUIREMENTS:
1. Extract ALL text while preserving document structure
2. Maintain headings hierarchy (main headings, subheadings)
3. Preserve important formatting:
   - Lists and bullet points
   - Numbered sequences
   - Tables (convert to readable text format)
4. Capture all critical information:
   - Dates and deadlines (keep exact format)
   - Numbers (fees, vacancies, age limits, etc.)
   - Contact information (emails, phone numbers, websites)
   - URLs and links
5. For tables: Convert to structured text format like:
   Category | Age Limit | Fee
   General | 21-30 years | Rs. 500
   OBC | 21-33 years | Rs. 250
6. Remove headers/footers if they're repetitive
7. De-duplicate any repeated content
8. If the PDF has multiple columns, read left to right, top to bottom

OUTPUT: Plain text with preserved structure. Do not add any commentary, just the extracted content.`
          }
        ]
      }]
    })

    const extractedText = message.content[0].type === 'text' ? message.content[0].text : ''

    if (!extractedText || extractedText.trim().length < 100) {
      throw new Error('Extracted text is too short or empty. The PDF might be image-based or encrypted.')
    }

    console.log(`Successfully extracted ${extractedText.length} characters from PDF`)

    // Save raw content
    await supabaseClient
      .from('study_notes')
      .update({ 
        raw_content: extractedText,
        processing_progress: 50 
      })
      .eq('id', note_id)

    // Trigger summarization
    const summaryResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-notes-summary`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note_id, raw_content: extractedText, language })
      }
    )

    if (!summaryResponse.ok) {
      console.error('Summarization trigger failed:', await summaryResponse.text())
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        extracted_length: extractedText.length,
        pdf_size_mb: sizeInMB.toFixed(2)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('PDF extraction error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Update note with error
    try {
      const { note_id } = await req.json()
      if (note_id) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        await supabaseClient
          .from('study_notes')
          .update({ 
            processing_status: 'failed',
            processing_error: errorMessage,
            processing_progress: 0
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