import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { application, language } = await req.json();
    
    if (!application) {
      throw new Error('Application data is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    // Build comprehensive context from application data
    const context = `
Title: ${application.title || 'N/A'}
Category: ${application.category || 'N/A'}
Description: ${application.description || 'N/A'}

Eligibility Criteria:
${application.eligibility || 'Not specified'}

Required Documents:
${Array.isArray(application.documents_required) ? application.documents_required.join(', ') : 'Not specified'}

Fee Structure:
${application.fee_structure || 'Not specified'}

Important Dates:
${Array.isArray(application.important_dates) ? application.important_dates.map((d: any) => `${d.event}: ${d.date}`).join('\n') : 'Not specified'}

Application Steps:
${application.application_steps || 'Not specified'}
    `.trim();

    // Create language-specific system prompt
    let systemPrompt = '';
    let userPrompt = '';
    
    if (language === 'hi') {
      systemPrompt = 'आप एक मददगार सहायक हैं जो भारत सरकार की योजनाओं के बारे में सरल हिंदी में समझाते हैं। आप किसानों, छात्रों और आम लोगों से दोस्ताना तरीके से बात करते हैं।';
      userPrompt = `नीचे दी गई सरकारी योजना की जानकारी को एक सरल, दोस्ताना और विस्तृत सारांश में बदलें। इसे ऐसे समझाएं जैसे आप किसी को आमने-सामने बता रहे हैं। सभी महत्वपूर्ण विवरण शामिल करें - शीर्षक, विवरण, पात्रता, दस्तावेज, शुल्क, तारीखें और आवेदन प्रक्रिया। स्वाभाविक संक्रमण का उपयोग करें जैसे "पहले मैं आपको बताता हूं...", "अब दस्तावेजों के बारे में..."। इसे 3-5 मिनट के भाषण की लंबाई में रखें।\n\nयोजना की जानकारी:\n${context}`;
    } else if (language === 'kn') {
      systemPrompt = 'ನೀವು ಭಾರತ ಸರ್ಕಾರದ ಯೋಜನೆಗಳನ್ನು ಸರಳ ಕನ್ನಡದಲ್ಲಿ ವಿವರಿಸುವ ಸಹಾಯಕರು. ನೀವು ರೈತರು, ವಿದ್ಯಾರ್ಥಿಗಳು ಮತ್ತು ಸಾಮಾನ್ಯ ಜನರೊಂದಿಗೆ ಸ್ನೇಹಪರವಾಗಿ ಮಾತನಾಡುತ್ತೀರಿ.';
      userPrompt = `ಕೆಳಗಿನ ಸರ್ಕಾರಿ ಯೋಜನೆಯ ಮಾಹಿತಿಯನ್ನು ಸರಳ, ಸ್ನೇಹಪರ ಮತ್ತು ವಿವರವಾದ ಸಾರಾಂಶದಲ್ಲಿ ಪರಿವರ್ತಿಸಿ. ನೀವು ಯಾರಿಗಾದರೂ ನೇರವಾಗಿ ತಿಳಿಸುತ್ತಿರುವಂತೆ ವಿವರಿಸಿ. ಎಲ್ಲಾ ಪ್ರಮುಖ ವಿವರಗಳನ್ನು ಸೇರಿಸಿ - ಶೀರ್ಷಿಕೆ, ವಿವರಣೆ, ಅರ್ಹತೆ, ದಾಖಲೆಗಳು, ಶುಲ್ಕ, ದಿನಾಂಕಗಳು ಮತ್ತು ಅರ್ಜಿ ಪ್ರಕ್ರಿಯೆ. ಸ್ವಾಭಾವಿಕ ಪರಿವರ್ತನೆಗಳನ್ನು ಬಳಸಿ. ಇದನ್ನು 3-5 ನಿಮಿಷಗಳ ಭಾಷಣದ ಉದ್ದದಲ್ಲಿ ಇರಿಸಿ.\n\nಯೋಜನೆಯ ಮಾಹಿತಿ:\n${context}`;
    } else {
      systemPrompt = 'You are a helpful guide explaining Indian government schemes in simple, friendly English. You speak to farmers, students, and common people in an approachable, conversational way.';
      userPrompt = `Convert the government scheme information below into a simple, friendly, and comprehensive summary. Explain it as if you're talking to someone face-to-face. Include ALL important details - title, description, eligibility, documents, fees, dates, and application process. Use natural transitions like "First, let me tell you about...", "Now, regarding the documents..."". Keep it to 3-5 minutes of speech length.\n\nScheme Information:\n${context}`;
    }

    console.log('Generating audio summary for language:', language);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated');
    }

    console.log('Summary generated successfully, length:', summary.length);

    // Generate audio using ElevenLabs
    const voiceId = 'kcQkGnn0HAT2JRDQ4Ljp'; // Norah - user's preferred voice
    
    console.log('Generating audio with ElevenLabs for language:', language);

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: summary,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.85,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('ElevenLabs API error:', ttsResponse.status, errorText);
      throw new Error('Failed to generate audio');
    }

    // Convert audio to base64 in chunks to avoid stack overflow
    const audioBuffer = await ttsResponse.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    let binaryString = '';
    const chunkSize = 8192; // Process 8KB at a time

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binaryString += String.fromCharCode(...chunk);
    }

    const base64Audio = btoa(binaryString);
    
    console.log('Audio generated successfully, size:', audioBuffer.byteLength);

    return new Response(
      JSON.stringify({ 
        summary,
        audioContent: base64Audio
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-audio-summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate audio summary' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
