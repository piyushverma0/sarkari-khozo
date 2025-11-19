// Extract Web Content - Use Claude Web Capability to extract article content
// Uses Claude Sonnet 4.5 with web browsing capability

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExtractRequest {
  note_id: string
  source_url: string
  source_type: string
  language: string
}

/**
 * Extract web article content using Claude's web capability
 */
async function extractWebContent(url: string): Promise<string> {
  console.log('📄 Extracting web content from:', url)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      temperature: 0,
      system: `You are an expert at extracting the main article content from web pages.

Your task:
1. Navigate to the provided URL and read the web page content
2. Extract ONLY the main article text, removing:
   - Navigation menus, headers, footers
   - Advertisements and promotional content
   - Comments sections
   - Social media widgets
   - Cookie notices and popups
3. Preserve the article structure with headings and paragraphs
4. Include important lists, quotes, and code blocks if present
5. Return ONLY the extracted article text, nothing else

Do NOT include any commentary, explanations, or meta-text. Just return the clean article content.`,
      messages: [
        {
          role: 'user',
          content: `Extract the main article content from this URL: ${url}

Return ONLY the article text with proper formatting. No explanations.`
        }
      ]
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Claude Web API error:', errorText)
    throw new Error(`Claude Web API error: ${errorText}`)
  }

  const data = await response.json()
  console.log('✅ Claude Web extraction complete')

  // Extract text from response
  let extractedText = ''
  if (data.content && data.content.length > 0) {
    for (const block of data.content) {
      if (block.type === 'text') {
        extractedText += block.text + '\n'
      }
    }
  }

  if (!extractedText.trim()) {
    throw new Error('No content could be extracted from the web page')
  }

  console.log('📊 Extracted content length:', extractedText.length, 'characters')
  return extractedText.trim()
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { note_id, source_url, language }: ExtractRequest = await req.json()

    if (!note_id || !source_url) {
      return new Response(
        JSON.stringify({ error: 'note_id and source_url are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🌐 Starting web content extraction for note:', note_id)
    console.log('🔗 URL:', source_url)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Update progress - starting extraction
    await supabase
      .from('study_notes')
      .update({
        processing_status: 'extracting',
        processing_progress: 20
      })
      .eq('id', note_id)

    // Step 1: Extract web content using Claude Web capability
    let extractedContent: string
    try {
      extractedContent = await extractWebContent(source_url)
    } catch (extractError) {
      console.error('❌ Web content extraction failed:', extractError)
      const errorMessage = extractError instanceof Error ? extractError.message : String(extractError)

      await supabase
        .from('study_notes')
        .update({
          processing_status: 'failed',
          processing_error: `Failed to extract web content: ${errorMessage}`
        })
        .eq('id', note_id)

      throw extractError
    }

    // Update progress - extraction complete
    await supabase
      .from('study_notes')
      .update({
        processing_progress: 50
      })
      .eq('id', note_id)

    // Step 2: Trigger summarization (same pattern as PDF and YouTube)
    try {
      console.log('📝 Triggering summarization for note:', note_id)

      const summaryResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-notes-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          note_id,
          raw_content: extractedContent,
          language: language || 'en'
        })
      })

      if (!summaryResponse.ok) {
        const errorText = await summaryResponse.text()
        console.error('❌ Summarization failed:', errorText)
        throw new Error(`Summarization failed: ${errorText}`)
      }

      console.log('✅ Summarization completed successfully for note:', note_id)
    } catch (triggerError) {
      console.error('❌ Failed to trigger or complete summarization:', triggerError)
      const errorMessage = triggerError instanceof Error ? triggerError.message : 'Failed to complete summarization process'

      // Update note status to failed
      await supabase
        .from('study_notes')
        .update({
          processing_status: 'failed',
          processing_error: errorMessage
        })
        .eq('id', note_id)

      throw triggerError
    }

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        extracted_length: extractedContent.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Web content extraction error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during web content extraction'

    // Try to extract note_id from the request
    let noteId: string | null = null
    try {
      const body = await req.clone().json()
      noteId = body.note_id
    } catch {
      // Ignore parsing errors
    }

    // Update database if we have a note_id
    if (noteId) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        await supabase
          .from('study_notes')
          .update({
            processing_status: 'failed',
            processing_error: errorMessage
          })
          .eq('id', noteId)
      } catch (dbError) {
        console.error('Failed to update error status in database:', dbError)
      }
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
