import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user profile data
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    console.log('Auto-matching programs for user:', user.id);

    // Get user profile data (you may need to adjust this based on your schema)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.warn('No profile found for user, using default matching');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build user profile summary
    const userContext = `
User Profile:
- Email: ${user.email}
- Profile Data: ${profile ? JSON.stringify(profile) : 'Not available'}

Based on this user's profile, analyze and recommend the most relevant Indian government startup programs and funding opportunities.
`;

    const prompt = `${userContext}

You are an AI matchmaker for Indian startup programs. Analyze the user's profile and recommend 5-10 programs they should apply for.

Consider:
- User's stage (if available)
- Sector/industry (if available)
- Location (if available)
- DPIIT recognition status (if available)
- Previous applications (if available)

For each recommended program, provide:
1. Program name
2. Why it's a good match (2-3 sentences)
3. Eligibility match score (0-100)
4. Estimated success probability
5. Next steps to take

Focus on programs from:
- Startup India (DPIIT)
- State Startup Missions
- SIDBI programs
- NIDHI (DST)
- Ministry schemes (MeitY, BIRAC, etc.)

Return recommendations as a JSON array:
[
  {
    "program_name": "NIDHI-PRAYAS",
    "match_reason": "Excellent fit because...",
    "eligibility_score": 85,
    "success_probability": "High",
    "next_steps": ["Step 1", "Step 2", "Step 3"],
    "program_type": "grant",
    "funding_amount": "₹10 lakh",
    "deadline": "Rolling" or "YYYY-MM-DD"
  }
]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { 
            status: 402, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from response
    let recommendations;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      recommendations = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse recommendations:', content);
      throw new Error('Failed to parse AI recommendations');
    }

    return new Response(
      JSON.stringify({ recommendations }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in auto-match-programs:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Failed to match programs'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
