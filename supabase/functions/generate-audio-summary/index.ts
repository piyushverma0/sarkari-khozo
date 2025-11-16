// Generate Audio Summary - Convert conversation script to audio using ElevenLabs
// Creates friendly conversational audio between Raj and Priya

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateAudioRequest {
  note_id: string
  language: 'hi' | 'en'
}

interface ConversationTurn {
  speaker: 'Raj' | 'Priya'
  text: string
  emotion?: string
}

// ElevenLabs voice IDs
const VOICES = {
  raj_english: 'pNInz6obpgDQGcFmaJgB', // Adam - male voice
  priya_english: 'EXAVITQu4vr4xnSDxMaL', // Bella - female voice
  raj_hindi: 'pNInz6obpgDQGcFmaJgB', // Adam with multilingual support
  priya_hindi: 'EXAVITQu4vr4xnSDxMaL', // Bella with multilingual support
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { note_id, language }: GenerateAudioRequest = await req.json()

    if (!note_id || !language) {
      return new Response(
        JSON.stringify({ error: 'note_id and language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🎙️ Generating ${language} audio for note: ${note_id}`)

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch note to check for existing script
    const scriptField = language === 'hi' ? 'audio_script_hindi' : 'audio_script_english'
    const audioUrlField = language === 'hi' ? 'audio_hindi_url' : 'audio_english_url'
    const audioDurationField = language === 'hi' ? 'audio_hindi_duration' : 'audio_english_duration'

    const { data: note, error: fetchError } = await supabase
      .from('study_notes')
      .select(`id, user_id, ${scriptField}`)
      .eq('id', note_id)
      .single()

    if (fetchError || !note) {
      throw new Error('Failed to fetch note: ' + (fetchError?.message || 'Note not found'))
    }

    // Step 1: Generate script if it doesn't exist
    let script = note[scriptField]

    if (!script || !script.turns || script.turns.length === 0) {
      console.log('📝 Script not found, generating...')

      const scriptResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-audio-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ note_id, language })
      })

      if (!scriptResponse.ok) {
        throw new Error('Failed to generate script')
      }

      const scriptData = await scriptResponse.json()
      script = scriptData.script
      console.log(`✅ Script generated with ${script.turns.length} turns`)
    } else {
      console.log(`📋 Using existing script with ${script.turns.length} turns`)
    }

    // Step 2: Update status to generating audio
    const statusField = language === 'hi' ? 'generating_audio_hindi' : 'generating_audio_english'
    await supabase
      .from('study_notes')
      .update({ audio_generation_status: statusField })
      .eq('id', note_id)

    // Step 3: Generate audio for each turn
    console.log('🎵 Generating audio segments...')
    const audioSegments: Uint8Array[] = []
    const silencePadding = createSilence(0.7) // 0.7 seconds silence between turns

    for (let i = 0; i < script.turns.length; i++) {
      const turn = script.turns[i]
      console.log(`  Turn ${i + 1}/${script.turns.length}: ${turn.speaker} - "${turn.text.substring(0, 50)}..."`)

      const audioData = await generateSpeech(turn, language)
      audioSegments.push(audioData)

      // Add silence between turns (except after last turn)
      if (i < script.turns.length - 1) {
        audioSegments.push(silencePadding)
      }
    }

    console.log(`✅ Generated ${audioSegments.length} audio segments`)

    // Step 4: Combine all audio segments
    console.log('🔗 Combining audio segments...')
    const combinedAudio = combineAudioSegments(audioSegments)
    console.log(`✅ Combined audio size: ${combinedAudio.length} bytes`)

    // Step 5: Upload to Supabase Storage
    console.log('☁️ Uploading to storage...')
    const fileName = `${note.user_id}/${note_id}/audio_${language}_${Date.now()}.mp3`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('study-materials')
      .upload(fileName, combinedAudio, {
        contentType: 'audio/mpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Failed to upload audio: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('study-materials')
      .getPublicUrl(fileName)

    console.log(`✅ Audio uploaded: ${publicUrl}`)

    // Calculate actual duration (estimate: 1 byte ≈ 0.0001 seconds for MP3)
    const estimatedDuration = Math.round(combinedAudio.length / 16000) // Rough estimate

    // Step 6: Update database with audio URL and metadata
    await supabase
      .from('study_notes')
      .update({
        [audioUrlField]: publicUrl,
        [audioDurationField]: estimatedDuration,
        audio_generation_status: 'completed',
        audio_generated_at: new Date().toISOString(),
        has_audio: true,
        audio_generation_error: null
      })
      .eq('id', note_id)

    console.log('🎉 Audio generation complete!')

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: publicUrl,
        duration: estimatedDuration,
        turns_count: script.turns.length,
        language: language
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in generate-audio-summary:', error)

    // Update status to failed
    try {
      const body = await req.json()
      if (body.note_id) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        await supabase
          .from('study_notes')
          .update({
            audio_generation_status: 'failed',
            audio_generation_error: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', body.note_id)
      }
    } catch (e) {
      console.error('Failed to update error status:', e)
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Generate speech for a single conversation turn using ElevenLabs
 */
async function generateSpeech(
  turn: ConversationTurn,
  language: 'hi' | 'en'
): Promise<Uint8Array> {
  const voiceId = language === 'hi'
    ? (turn.speaker === 'Raj' ? VOICES.raj_hindi : VOICES.priya_hindi)
    : (turn.speaker === 'Raj' ? VOICES.raj_english : VOICES.priya_english)

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: turn.text,
      model_id: 'eleven_multilingual_v2', // Supports both English and Hindi
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs API error: ${errorText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Create silence padding (simple WAV format)
 */
function createSilence(durationSeconds: number): Uint8Array {
  // Simple silence: just return empty audio buffer
  // For MP3, we'll use a small silent MP3 segment
  const sampleRate = 24000
  const samples = Math.floor(durationSeconds * sampleRate)
  return new Uint8Array(samples * 2) // 16-bit samples
}

/**
 * Combine multiple audio segments into one
 */
function combineAudioSegments(segments: Uint8Array[]): Uint8Array {
  // Calculate total length
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0)

  // Create combined buffer
  const combined = new Uint8Array(totalLength)

  let offset = 0
  for (const segment of segments) {
    combined.set(segment, offset)
    offset += segment.length
  }

  return combined
}
