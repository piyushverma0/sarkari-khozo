import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache for common responses
const responseCache = new Map<string, string>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language = 'en' } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    console.log('Generating voice response for:', { text: text.substring(0, 50), language });

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    // Check cache for common responses
    const cacheKey = `${language}:${text}`;
    if (responseCache.has(cacheKey)) {
      console.log('Returning cached audio response');
      return new Response(
        JSON.stringify({ audioContent: responseCache.get(cacheKey) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select voice based on language
    // Using Aria (Indian English voice) for warm, conversational tone
    const voiceId = language === 'hi' ? '9BWtsMINqrJLrRacOk9x' : '9BWtsMINqrJLrRacOk9x'; // Aria
    const model = 'eleven_multilingual_v2';

    // Voice settings optimized for Sakhi's personality
    const voiceSettings = {
      stability: 0.5,           // Slightly expressive, natural variations
      similarity_boost: 0.85,   // Consistent identity
      style: 0.3,               // Conversational, not monotone
      use_speaker_boost: true   // Enhanced clarity
    };

    // Split long text into chunks if needed (ElevenLabs has 5000 char limit)
    const maxChunkLength = 4500;
    const chunks = [];
    
    if (text.length > maxChunkLength) {
      // Split by sentences
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkLength) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
      if (currentChunk) chunks.push(currentChunk);
    } else {
      chunks.push(text);
    }

    // Generate audio for all chunks
    const audioBuffers: Uint8Array[] = [];

    for (const chunk of chunks) {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: chunk,
            model_id: model,
            voice_settings: voiceSettings
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      audioBuffers.push(new Uint8Array(arrayBuffer));
    }

    // Combine audio buffers
    let totalLength = 0;
    for (const buffer of audioBuffers) {
      totalLength += buffer.length;
    }

    const combinedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of audioBuffers) {
      combinedBuffer.set(buffer, offset);
      offset += buffer.length;
    }

    // Convert to base64
    const base64Audio = btoa(
      String.fromCharCode(...combinedBuffer)
    );

    // Cache common short responses
    if (text.length < 100) {
      responseCache.set(cacheKey, base64Audio);
      
      // Limit cache size
      if (responseCache.size > 50) {
        const firstKey = responseCache.keys().next().value;
        if (firstKey) {
          responseCache.delete(firstKey);
        }
      }
    }

    console.log('Successfully generated audio response');

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('TTS generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
