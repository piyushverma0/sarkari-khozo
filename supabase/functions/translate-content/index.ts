import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { callClaude, logClaudeUsage } from "../_shared/claude-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      throw new Error('Text and target language are required');
    }

    // Determine language prompt
    let languageName = '';
    let languageContext = '';
    
    if (targetLanguage === 'hi') {
      languageName = 'Hindi (हिंदी)';
      languageContext = 'Use Devanagari script. Keep government scheme terminology accurate.';
    } else if (targetLanguage === 'kn') {
      languageName = 'Kannada (ಕನ್ನಡ)';
      languageContext = 'Use Kannada script. Keep government scheme terminology accurate.';
    } else {
      throw new Error('Unsupported language. Use "hi" for Hindi or "kn" for Kannada');
    }

    console.log('Translating to:', languageName);

    const response = await callClaude({
      systemPrompt: `You are a professional translator for Indian government schemes. Translate to ${languageName}. ${languageContext} Only return the translated text.`,
      userPrompt: text,
      enableWebSearch: false,
      temperature: 0.3,
    });

    logClaudeUsage('translate-content', response.tokensUsed, false);
    console.log('Translation successful');

    return new Response(
      JSON.stringify({ translatedText: response.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Translation failed' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
