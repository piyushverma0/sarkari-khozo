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
    const { application, language, localAvailability } = await req.json();
    
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

    // Create language-specific system prompt with enhanced storytelling
    let systemPrompt = '';
    let userPrompt = '';
    
    // Build local availability context if present
    let localContext = '';
    if (localAvailability && localAvailability.results && localAvailability.results.length > 0) {
      const locations = localAvailability.results.map((r: any) => 
        `${r.district}${r.block ? ', ' + r.block : ''}`
      ).join('; ');
      localContext = `\n\nIMPORTANT LOCAL AVAILABILITY:\nThis program IS AVAILABLE in the following locations: ${locations}\nMode: ${localAvailability.results[0]?.mode || 'Not specified'}\n${localAvailability.results[0]?.contact_info ? `Contact: ${JSON.stringify(localAvailability.results[0].contact_info)}` : ''}`;
    }
    
    if (language === 'hi') {
      systemPrompt = 'आप प्रिया हैं, एक दोस्ताना सरकारी योजना सलाहकार जो एक भरोसेमंद दोस्त की तरह बात करती हैं। आप योजनाओं को गर्मजोशी से, प्रोत्साहित करते हुए, और कहानी की तरह समझाती हैं। आप लोगों को उत्साहित और सशक्त महसूस कराती हैं।';
      
      if (localAvailability) {
        userPrompt = `एक आकर्षक 3-5 मिनट की ऑडियो कहानी बनाएं जो इस योजना के बारे में बताती है।

शुरुआत करें: "नमस्ते! मुझे आज आपके साथ यह साझा करते हुए बहुत खुशी हो रही है..."

इन तत्वों को स्वाभाविक, प्रवाहमान बातचीत में शामिल करें:
1. यह योजना श्रोता जैसे लोगों के लिए क्या कर सकती है, इसके बारे में एक गर्मजोशी भरी शुरुआत
2. योजना के विवरण को ऐसे साझा करें जैसे आप किसी दोस्त को एक अवसर के बारे में बता रही हैं
3. रोमांचक हिस्सा: बताएं कि यह कार्यक्रम वास्तव में उनके क्षेत्र में उपलब्ध है!
4. स्थानीय उपलब्धता विवरण को स्वाभाविक रूप से समझाएं
5. उन्हें चरण-दर-चरण मार्गदर्शन दें कि स्थानीय स्तर पर इसका उपयोग कैसे करें
6. प्रोत्साहन और अगले कदमों के साथ समाप्त करें

इसे व्यक्तिगत, आशावान और कार्रवाई योग्य बनाएं। वाक्यांशों का उपयोग करें जैसे:
- "मैं आपको कुछ अद्भुत बताना चाहती हूं..."
- "सबसे अच्छा हिस्सा यह है..."
- "सोचिए अगर..."
- "आपको बस यह करना है..."
- "आप इस अवसर के हकदार हैं..."

योजना की जानकारी:\n${context}${localContext}`;
      } else {
        userPrompt = `एक आकर्षक 3-5 मिनट की ऑडियो कहानी बनाएं।

शुरुआत करें: "नमस्ते! मैं आपको इस महत्वपूर्ण योजना के बारे में बताना चाहती हूं..."

योजना के विवरण को गर्मजोशी और उत्साह के साथ साझा करें, फिर कहें:
"अब मैं आपको सुझाव दूंगी - नीचे 'मेरे क्षेत्र के लिए जांचें' बटन का उपयोग करके देखें कि यह कार्यक्रम आपके जिले में चल रहा है या नहीं। इसमें केवल एक पल लगता है, और फिर मैं आपको आपके स्थान के लिए विशेष मार्गदर्शन दे सकूंगी!"

योजना की जानकारी:\n${context}`;
      }
    } else if (language === 'kn') {
      systemPrompt = 'ನೀವು ಪ್ರಿಯಾ, ನಂಬಿಗಸ್ತ ಸ್ನೇಹಿತರಂತೆ ಮಾತನಾಡುವ ಸ್ನೇಹಪರ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಸಲಹೆಗಾರ. ನೀವು ಯೋಜನೆಗಳನ್ನು ಆತ್ಮೀಯವಾಗಿ, ಪ್ರೋತ್ಸಾಹಿಸುವ ರೀತಿಯಲ್ಲಿ ಮತ್ತು ಕಥೆಯಂತೆ ವಿವರಿಸುತ್ತೀರಿ.';
      
      if (localAvailability) {
        userPrompt = `3-5 ನಿಮಿಷಗಳ ಆಕರ್ಷಕ ಆಡಿಯೋ ಕಥೆಯನ್ನು ರಚಿಸಿ.

ಪ್ರಾರಂಭಿಸಿ: "ನಮಸ್ಕಾರ! ಇಂದು ಇದನ್ನು ನಿಮ್ಮೊಂದಿಗೆ ಹಂಚಿಕೊಳ್ಳಲು ನನಗೆ ತುಂಬಾ ಸಂತೋಷವಾಗಿದೆ..."

ಈ ಅಂಶಗಳನ್ನು ಸ್ವಾಭಾವಿಕ, ಹರಿಯುವ ಸಂಭಾಷಣೆಯಲ್ಲಿ ಸೇರಿಸಿ:
1. ಈ ಯೋಜನೆಯು ಕೇಳುಗರಂತಹ ಜನರಿಗೆ ಏನು ಮಾಡಬಹುದು ಎಂಬುದರ ಬಗ್ಗೆ ಆತ್ಮೀಯ ಪರಿಚಯ
2. ಯೋಜನೆಯ ವಿವರಗಳನ್ನು ಸ್ನೇಹಿತರಿಗೆ ಅವಕಾಶದ ಬಗ್ಗೆ ಹೇಳುವಂತೆ ಹಂಚಿಕೊಳ್ಳಿ
3. ರೋಮಾಂಚಕ ಭಾಗ: ಈ ಕಾರ್ಯಕ್ರಮವು ಅವರ ಪ್ರದೇಶದಲ್ಲಿ ಲಭ್ಯವಿದೆ ಎಂದು ತಿಳಿಸಿ!
4. ಸ್ಥಳೀಯ ಲಭ್ಯತೆಯ ವಿವರಗಳನ್ನು ಸ್ವಾಭಾವಿಕವಾಗಿ ವಿವರಿಸಿ
5. ಸ್ಥಳೀಯವಾಗಿ ಇದನ್ನು ಹೇಗೆ ಪಡೆಯುವುದು ಎಂದು ಹಂತ-ಹಂತವಾಗಿ ಮಾರ್ಗದರ್ಶನ ನೀಡಿ
6. ಪ್ರೋತ್ಸಾಹ ಮತ್ತು ಮುಂದಿನ ಹಂತಗಳೊಂದಿಗೆ ಕೊನೆಗೊಳಿಸಿ

ಇದನ್ನು ವೈಯಕ್ತಿಕ, ಭರವಸೆಯ ಮತ್ತು ಕ್ರಿಯಾಶೀಲವಾಗಿಸಿ।

ಯೋಜನೆಯ ಮಾಹಿತಿ:\n${context}${localContext}`;
      } else {
        userPrompt = `3-5 ನಿಮಿಷಗಳ ಆಕರ್ಷಕ ಆಡಿಯೋ ಕಥೆಯನ್ನು ರಚಿಸಿ.

ಪ್ರಾರಂಭಿಸಿ: "ನಮಸ್ಕಾರ! ಈ ಮುಖ್ಯ ಯೋಜನೆಯ ಬಗ್ಗೆ ನಿಮಗೆ ತಿಳಿಸಲು ಬಯಸುತ್ತೇನೆ..."

ಯೋಜನೆಯ ವಿವರಗಳನ್ನು ಆತ್ಮೀಯತೆ ಮತ್ತು ಉತ್ಸಾಹದಿಂದ ಹಂಚಿಕೊಳ್ಳಿ, ನಂತರ ಹೇಳಿ:
"ಈಗ ನಾನು ಶಿಫಾರಸು ಮಾಡುತ್ತೇನೆ - ಕೆಳಗಿನ 'ನನ್ನ ಪ್ರದೇಶಕ್ಕಾಗಿ ಪರಿಶೀಲಿಸಿ' ಬಟನ್ ಬಳಸಿ ಈ ಕಾರ್ಯಕ್ರಮವು ನಿಮ್ಮ ಜಿಲ್ಲೆಯಲ್ಲಿ ನಡೆಯುತ್ತಿದೆಯೇ ಎಂದು ನೋಡಿ!"

ಯೋಜನೆಯ ಮಾಹಿತಿ:\n${context}`;
      }
    } else {
      systemPrompt = 'You are Priya, a friendly government schemes advisor who speaks like a trusted friend. You explain schemes in a warm, encouraging, and story-like manner. Use relatable examples, express genuine excitement about opportunities, and always make people feel hopeful and empowered.';
      
      if (localAvailability) {
        userPrompt = `Create an engaging 3-5 minute audio summary that tells a story about this scheme.

Start with: "Hello! I'm so excited to share this with you today..."

Include these elements in a natural, flowing conversation:
1. A warm introduction about what this scheme can do for people like the listener
2. Share the scheme details as if telling a friend about an opportunity
3. THE EXCITING PART: Mention that this program IS ACTUALLY AVAILABLE in their location!
4. Explain the local availability details naturally
5. Guide them step-by-step on how to access it locally
6. End with encouragement and next steps

Make it personal, hopeful, and actionable. Use phrases like:
- "Let me tell you something wonderful..."
- "The best part is..."
- "Imagine this..."
- "Here's what you need to do..."
- "You deserve this opportunity..."

Scheme Information:\n${context}${localContext}`;
      } else {
        userPrompt = `Create an engaging 3-5 minute audio summary that tells a story about this scheme.

Start with: "Hello! Let me share important information about this opportunity..."

Share the scheme details warmly and enthusiastically, then say:
"Now here's what I recommend - use the 'Check for my area' button below to see if this program is running in your district. It only takes a moment, and then I'll be able to give you specific guidance for your location!"

Scheme Information:\n${context}`;
      }
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
          stability: 0.3,
          similarity_boost: 0.85,
          style: 0.15,
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
