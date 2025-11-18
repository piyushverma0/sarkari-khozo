import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

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

    console.log(`Starting YouTube extraction for note ${note_id}`)

    // Update status
    await supabaseClient
      .from('study_notes')
      .update({ processing_status: 'extracting', processing_progress: 10 })
      .eq('id', note_id)

    // Extract video ID from YouTube URL
    const videoId = extractVideoId(source_url)
    if (!videoId) throw new Error('Invalid YouTube URL')

    console.log(`Fetching transcript for video ${videoId}`)

    // Fetch transcript using YouTube API or transcript API
    const transcript = await fetchYouTubeTranscript(videoId, language)

    console.log(`Transcript fetched, length: ${transcript.length} characters`)

    // Save raw content
    await supabaseClient
      .from('study_notes')
      .update({ 
        raw_content: transcript,
        processing_progress: 50,
        title: `YouTube: ${videoId}`, // You can fetch actual title from YouTube API
        word_count: transcript.split(/\s+/).length,
        estimated_read_time: Math.ceil(transcript.split(/\s+/).length / 200)
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
      body: JSON.stringify({ note_id, raw_content: transcript, language })
    }).catch(err => console.error('Summarization trigger error:', err))

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('YouTube extraction error:', error)
    
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

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  return null
}

async function fetchYouTubeTranscript(videoId: string, language: string): Promise<string> {
  // Option 1: Use YouTube Transcript API (https://github.com/jdepoix/youtube-transcript-api)
  // Option 2: Use a third-party service like youtube-transcript npm package
  // For now, using a simple approach with YouTube's timedtext API
  
  try {
    const langCode = language === 'hi' ? 'hi' : 'en'
    const url = `https://www.youtube.com/api/timedtext?lang=${langCode}&v=${videoId}`
    
    console.log(`Fetching transcript from: ${url}`)
    
    const response = await fetch(url)
    if (!response.ok) throw new Error('Transcript not available')
    
    const xml = await response.text()
    
    // Parse XML and extract text
    const textMatches = xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)
    const transcript = Array.from(textMatches)
      .map(match => decodeHTML(match[1]))
      .join(' ')
    
    if (!transcript || transcript.length < 10) {
      throw new Error('Transcript is empty or too short')
    }
    
    return transcript
  } catch (error) {
    throw new Error(`Failed to fetch transcript: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function decodeHTML(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
