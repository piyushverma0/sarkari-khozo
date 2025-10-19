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
    const { query, intentType } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a legal policy researcher specializing in Indian legal opportunities, fellowships, judiciary exams, and government schemes.

Your task is to find active or upcoming opportunities for legal professionals in India based on the user's query.

Search across:
- Supreme Court and High Courts
- NALSA (National Legal Services Authority)
- Department of Justice, Ministry of Law & Justice
- Bar Council of India (BCI)
- State legal services authorities
- Law universities and research institutions
- Legal aid programs and fellowships

For each opportunity, extract:
1. title: Full official name
2. description: Comprehensive summary (2-3 sentences)
3. program_type: One of [Judiciary Exam, Fellowship, Internship, Legal Aid, Scholarship, Research Program]
4. funding_amount: Stipend/fellowship amount if applicable
5. eligibility: Key eligibility criteria (degree, age, bar enrollment, etc.)
6. duration: Program duration
7. location: State/city or "Pan-India"
8. url: Official application link if available
9. important_dates: { application_start, application_deadline, exam_date, result_date }
10. documents_required: List of required documents
11. application_process: Step-by-step guide

Return ONLY a valid JSON array of 3-6 programs. Use this exact format:
[
  {
    "title": "NALSA Legal Aid Fellowship 2025",
    "description": "Fellowship supporting young lawyers in providing free legal aid in rural districts under the National Legal Services Authority (NALSA).",
    "program_type": "Fellowship",
    "funding_amount": "₹50,000 monthly stipend",
    "eligibility": "LLB degree, enrolled with Bar Council, age under 35",
    "duration": "12 months (renewable)",
    "location": "Pan-India",
    "url": "https://nalsa.gov.in/fellowships",
    "important_dates": {
      "application_start": "2025-01-15",
      "application_deadline": "2025-02-28",
      "selection_announcement": "2025-03-30"
    },
    "documents_required": ["Bar Council Certificate", "LLB Degree", "Aadhaar Card", "Bank Details", "Declaration"],
    "application_process": "Apply online through NALSA portal → Upload documents → Wait for shortlisting → Attend interview"
  }
]

Focus on verified, government-backed opportunities. If the query mentions a specific state, prioritize state-specific programs.`;

    const userPrompt = `${query}

Intent: ${intentType || 'general'}

Find 3-6 relevant legal opportunities matching this query. Return valid JSON only.`;

    console.log('Calling Lovable AI API...');
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
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to generate programs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Lovable AI response received');
    
    const aiResponse = data.choices[0].message.content;
    console.log('AI Response:', aiResponse);

    let programs = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        programs = JSON.parse(jsonMatch[0]);
      } else {
        programs = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response content:', aiResponse);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', details: aiResponse }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${programs.length} programs`);

    return new Response(
      JSON.stringify({ programs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-lawyer-programs function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
