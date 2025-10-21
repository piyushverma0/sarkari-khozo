import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, applicationId } = await req.json();
    console.log('Extracting stats for application:', applicationId);

    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Valid content string is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use Lovable AI to extract stats
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'AI service not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Extract application statistics from this text content about a government scheme, program, or job posting. 
    
Text content:
${content.substring(0, 3000)}

Extract the following if available:
- Number of applicants/applications received (last year or current year)
- Number of vacancies/posts/seats available
- Year the data is from
- Exact quote from text that contains these numbers

Return ONLY a JSON object with this exact structure (no markdown formatting):
{
  "applicants_count": number or null,
  "vacancies": number or null,
  "year": number (current year if not specified),
  "confidence_score": 0.0-1.0 (how confident you are),
  "source_quote": "exact text snippet with numbers",
  "data_source": "brief description of source"
}

Rules:
- Convert lakh to actual numbers (1 lakh = 100000)
- Convert crore to actual numbers (1 crore = 10000000)
- If you see "50 lakh applied", set applicants_count to 5000000
- If data is not found, set to null
- Confidence < 0.5 if numbers are unclear or missing
- Confidence > 0.8 if numbers are explicitly stated
- Return ONLY valid JSON, no other text`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a data extraction assistant that returns only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Rate limit exceeded. Please try again later.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'AI service quota exceeded' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({
        success: false,
        error: 'AI extraction service unavailable'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    let jsonText = extractedText;
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }
    
    let stats;
    try {
      stats = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', jsonText);
      return new Response(JSON.stringify({
        success: false,
        error: 'Could not extract valid statistics from content'
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Extracted stats:', stats);

    // Validate stats
    if (stats.applicants_count && (stats.applicants_count < 10 || stats.applicants_count > 100000000)) {
      console.warn('Applicants count out of valid range:', stats.applicants_count);
      stats.confidence_score = Math.min(stats.confidence_score, 0.5);
    }
    if (stats.vacancies && (stats.vacancies < 1 || stats.vacancies > 10000000)) {
      console.warn('Vacancies out of valid range:', stats.vacancies);
      stats.confidence_score = Math.min(stats.confidence_score, 0.5);
    }

    // Calculate competition ratio if both values present
    if (stats.applicants_count && stats.vacancies && stats.vacancies > 0) {
      const ratio = Math.round(stats.applicants_count / stats.vacancies);
      stats.competition_ratio = `${ratio.toLocaleString('en-IN')}:1`;
    }

    // Determine data confidence level
    let dataConfidence = 'estimated';
    if (stats.confidence_score > 0.85) {
      dataConfidence = 'verified';
    } else if (stats.confidence_score < 0.5) {
      dataConfidence = 'community';
    }

    // Save to database if applicationId provided and confidence is reasonable
    if (applicationId && stats.confidence_score > 0.5) {
      const { error: insertError } = await supabase
        .from('scheme_stats')
        .upsert({
          application_id: applicationId,
          year: stats.year || new Date().getFullYear(),
          applicants_count: stats.applicants_count,
          vacancies: stats.vacancies,
          competition_ratio: stats.competition_ratio || null,
          data_source: stats.data_source || 'AI extraction from scheme content',
          data_confidence: dataConfidence,
          confidence_score: stats.confidence_score,
          source_quote: stats.source_quote,
        }, {
          onConflict: 'application_id,year',
        });

      if (insertError) {
        console.error('Failed to save stats:', insertError);
      } else {
        console.log('Stats saved successfully');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      stats: {
        ...stats,
        data_confidence: dataConfidence,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error extracting stats:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to extract stats',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
