// Process Audio Lecture - Extract text from audio and generate notes
// Handles: MP3, M4A, WAV, AAC audio files
// Uses: Eleven Labs API for speech-to-text

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ELEVEN_LABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessAudioRequest {
  note_id: string
  source_url: string
  language: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { note_id, source_url, language }: ProcessAudioRequest = await req.json()

    if (!note_id || !source_url) {
      return new Response(
        JSON.stringify({ error: 'note_id and source_url are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🎙️ Processing audio lecture for note:', note_id)
    console.log('📁 Audio URL:', source_url)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Update status to extracting
    await supabase
      .from('study_notes')
      .update({
        processing_status: 'extracting',
        processing_progress: 20
      })
      .eq('id', note_id)

    // Step 1: Download audio file from storage using authenticated client
    console.log('📥 Downloading audio file from storage...')
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('study-materials')
      .download(source_url) // source_url is now the storage path
    
    if (downloadError || !audioData) {
      throw new Error(`Failed to download audio: ${downloadError?.message || 'No data'}`)
    }
    
    const audioBuffer = await audioData.arrayBuffer()
    const audioSizeBytes = audioBuffer.byteLength
    console.log(`📊 Audio size: ${(audioSizeBytes / 1024 / 1024).toFixed(2)} MB`)

    // Step 2: Estimate duration (simple estimation for MVP)
    // More accurate detection will be added in Phase 2
    const estimatedDuration = estimateDuration(audioSizeBytes)
    console.log(`⏱️ Estimated duration: ${Math.floor(estimatedDuration / 60)} minutes`)

    // Update progress
    await supabase
      .from('study_notes')
      .update({
        processing_progress: 30
      })
      .eq('id', note_id)

    // Step 3: Transcribe audio using Eleven Labs
    console.log('🎤 Transcribing audio with Eleven Labs...')
    const transcript = await transcribeWithElevenLabs(audioBuffer, language)

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No speech detected in audio file')
    }

    console.log(`📝 Transcript length: ${transcript.length} characters`)

    // Update progress
    await supabase
      .from('study_notes')
      .update({
        processing_progress: 50
      })
      .eq('id', note_id)

    // Step 4: Delegate to generate-notes-summary (same pattern as other tools)
    console.log('📚 Generating notes from transcript...')

    const summaryResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-notes-summary`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          note_id,
          raw_content: transcript,
          language: language || 'en'
        })
      }
    )

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text()
      console.error('❌ Summarization failed:', errorText)
      throw new Error(`Summarization failed: ${errorText}`)
    }

    console.log('✅ Audio lecture processing completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        note_id,
        transcript_length: transcript.length,
        audio_duration: estimatedDuration
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Audio processing error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error during audio processing'

    // Try to extract note_id from request
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

/**
 * Estimate audio duration from file size
 * Simple estimation: 1 MB ≈ 1 minute at 128 kbps
 * More accurate detection will be added in Phase 2
 */
function estimateDuration(fileSizeBytes: number): number {
  const sizeMB = fileSizeBytes / (1024 * 1024)
  const estimatedMinutes = sizeMB // Rough estimate
  return Math.ceil(estimatedMinutes * 60) // Return seconds
}

/**
 * Transcribe audio using Eleven Labs Speech-to-Text API
 */
async function transcribeWithElevenLabs(
  audioBuffer: ArrayBuffer,
  language: string
): Promise<string> {
  try {
    // Detect audio format from buffer (simple magic number detection)
    const audioFormat = detectAudioFormat(audioBuffer)
    console.log(`🎵 Detected format: ${audioFormat}`)

    // Create FormData with audio file
    const blob = new Blob([audioBuffer], {
      type: getMimeType(audioFormat)
    })

    const formData = new FormData()
    formData.append('audio', blob, `audio.${audioFormat}`)

    // Optional: Add language code if Eleven Labs supports it
    // formData.append('language', language)

    // Call Eleven Labs Speech-to-Text API
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_LABS_API_KEY
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Eleven Labs API error:', errorText)
      throw new Error(`Eleven Labs transcription failed: ${response.status}`)
    }

    const result = await response.json()

    // Eleven Labs returns: { text: "transcribed text", confidence: 0.95 }
    const transcript = result.text || result.transcript || ''

    if (!transcript) {
      throw new Error('Empty transcript returned from Eleven Labs')
    }

    return transcript

  } catch (error) {
    console.error('Transcription error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown transcription error'
    throw new Error(`Failed to transcribe audio: ${errorMessage}`)
  }
}

/**
 * Detect audio format from file signature (magic numbers)
 */
function detectAudioFormat(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)

  // MP3: starts with ID3 or FF FB/FF F3
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return 'mp3'
  }
  if (bytes[0] === 0xFF && (bytes[1] === 0xFB || bytes[1] === 0xF3 || bytes[1] === 0xF2)) {
    return 'mp3'
  }

  // M4A/AAC: starts with 'ftyp'
  const ftypIndex = new Uint8Array(buffer.slice(4, 8))
  if (String.fromCharCode(...ftypIndex) === 'ftyp') {
    return 'm4a'
  }

  // WAV: starts with 'RIFF'
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return 'wav'
  }

  // Default to mp3
  return 'mp3'
}

/**
 * Get MIME type for audio format
 */
function getMimeType(format: string): string {
  switch (format) {
    case 'mp3':
      return 'audio/mpeg'
    case 'm4a':
      return 'audio/mp4'
    case 'wav':
      return 'audio/wav'
    case 'aac':
      return 'audio/aac'
    default:
      return 'audio/mpeg'
  }
}
