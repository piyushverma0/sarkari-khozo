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
    if (!user) {
      throw new Error('Not authenticated')
    }

    const { source_type, source_url, file_name, language = 'en' } = await req.json()

    console.log(`Processing ${source_type} for user ${user.id}`)

    // Create initial note record
    const { data: note, error: insertError } = await supabaseClient
      .from('study_notes')
      .insert({
        user_id: user.id,
        title: file_name || 'Processing...',
        source_type,
        source_url,
        source_filename: file_name,
        original_language: language,
        current_language: language,
        processing_status: 'pending',
        processing_progress: 0
      })
      .select()
      .single()

    if (insertError) throw insertError

    console.log(`Created note ${note.id}, starting processing`)

    // Trigger background processing based on source type
    const processingFunction = getProcessingFunction(source_type)
    const processingUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${processingFunction}`
    
    console.log(`Triggering ${processingFunction} for note ${note.id}`)

    // Start async processing (don't await)
    fetch(processingUrl, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('Authorization')!,
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      },
      body: JSON.stringify({
        note_id: note.id,
        source_url,
        source_type,
        language
      })
    }).catch(err => console.error('Processing trigger error:', err))

    return new Response(
      JSON.stringify({ 
        note,
        message: 'Processing started. Check back in a few moments.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-study-material:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

function getProcessingFunction(sourceType: string): string {
  switch (sourceType) {
    case 'pdf': return 'extract-pdf-content'
    case 'docx': return 'extract-docx-content'
    case 'youtube': return 'extract-youtube-transcript'
    default: return 'extract-pdf-content'
  }
}
