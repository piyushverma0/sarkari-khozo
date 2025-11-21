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
    const { text, context, note_id, language = 'en' } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `You are an educational AI assistant. A student has selected the following text from their study notes and wants you to explain it clearly.

Selected Text: "${text}"

Context (surrounding content): "${context || 'No additional context provided'}"

Provide a comprehensive explanation in JSON format with:
1. summary: A clear, concise summary (2-3 sentences)
2. keyPoints: Array of 3-5 key points to understand
3. examples: Array of 1-2 practical examples
4. relatedConcepts: Array of related topics they should explore
5. difficulty: Assessment of difficulty level (basic/intermediate/advanced)

Make it engaging, clear, and educational for exam preparation. Return ONLY valid JSON, no markdown formatting.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful educational AI assistant. Always return valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;

    // Parse the JSON response, removing markdown code blocks if present
    let explanationJson;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      explanationJson = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    const result = {
      id: crypto.randomUUID(),
      note_id,
      selected_text: text,
      explanation_text: explanationJson.summary,
      explanation_json: explanationJson,
      language,
      model_version: 'google/gemini-2.5-flash',
      created_at: new Date().toISOString(),
    };

    console.log('Explanation generated successfully for note:', note_id);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in explain-text function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
