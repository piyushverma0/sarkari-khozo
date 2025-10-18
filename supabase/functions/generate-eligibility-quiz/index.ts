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
    const { 
      eligibility,
      // Startup-specific parameters
      programTitle, 
      sector, 
      stage, 
      fundingAmount, 
      dpiitRequired,
      answers,
      analyze 
    } = await req.json();
    
    if (!eligibility) {
      return new Response(
        JSON.stringify({ error: 'Eligibility criteria is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Check if this is a startup program quiz (has programTitle)
    const isStartupQuiz = !!programTitle;

    if (isStartupQuiz && analyze && answers) {
      // Analyze answers and provide eligibility verdict for startup programs
      console.log('Analyzing startup eligibility answers');
      
      const analysisPrompt = `You are a startup program eligibility expert.

Program: ${programTitle}
Eligibility Criteria: ${eligibility}
${sector ? `Target Sector: ${sector}` : ''}
${stage ? `Target Stage: ${stage}` : ''}
${fundingAmount ? `Funding: ${fundingAmount}` : ''}
${dpiitRequired !== undefined ? `DPIIT Required: ${dpiitRequired}` : ''}

User's Answers: ${JSON.stringify(answers)}

Analyze the user's answers against the eligibility criteria and return a JSON object with:
{
  "eligible": true/false,
  "matchedCriteria": ["criterion 1 they meet", "criterion 2 they meet"],
  "unmatchedCriteria": ["criterion 1 they don't meet", "criterion 2 they don't meet"],
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"]
}

Be specific and actionable in your suggestions. If not eligible, explain what they need to do to become eligible.`;

      const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'user', content: analysisPrompt }
          ],
        }),
      });

      if (!analysisResponse.ok) {
        if (analysisResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (analysisResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errorText = await analysisResponse.text();
        console.error('Lovable AI error:', analysisResponse.status, errorText);
        throw new Error(`AI API error: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      const content = analysisData.choices[0].message.content;

      let result;
      try {
        const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        result = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('Failed to parse analysis response:', content);
        throw new Error('Failed to parse AI response');
      }

      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (isStartupQuiz) {
      // Generate quiz questions for startup programs
      console.log('Generating startup eligibility quiz for:', programTitle);
      console.log('Eligibility:', eligibility);
      console.log('Sector:', sector, 'Stage:', stage, 'Funding:', fundingAmount, 'DPIIT:', dpiitRequired);
      
      const quizPrompt = `You are a startup program eligibility expert. Generate 5-7 quick questions to assess eligibility for this program.

Program: ${programTitle}
Eligibility Criteria: ${eligibility}
${sector ? `Target Sector: ${sector}` : ''}
${stage ? `Target Stage: ${stage}` : ''}
${fundingAmount ? `Funding: ${fundingAmount}` : ''}
${dpiitRequired !== undefined ? `DPIIT Required: ${dpiitRequired}` : ''}

Generate questions that cover:
- Business stage/maturity
- Sector/industry
- Registration status (company registration, DPIIT)
- Team size and composition
- Revenue/funding status
- Location/state

Return ONLY valid JSON (no markdown, no backticks) with this structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "What is your startup's current stage?",
      "options": ["Idea Stage", "Prototype/MVP", "Early Revenue", "Growth Stage"]
    },
    {
      "id": "q2",
      "question": "Next question...",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
    }
  ]
}

Make questions specific to the program's eligibility criteria. Keep options clear and mutually exclusive.`;

      console.log('Calling Lovable AI...');
      const quizResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'user', content: quizPrompt }
          ],
        }),
      });

      console.log('AI Response status:', quizResponse.status);

      if (!quizResponse.ok) {
        if (quizResponse.status === 429) {
          console.error('Rate limit exceeded');
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (quizResponse.status === 402) {
          console.error('AI credits exhausted');
          return new Response(
            JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errorText = await quizResponse.text();
        console.error('Lovable AI error:', quizResponse.status, errorText);
        throw new Error(`AI API error: ${quizResponse.status}`);
      }

      const quizData = await quizResponse.json();
      const content = quizData.choices[0].message.content;
      console.log('AI Response content (first 200 chars):', content.substring(0, 200));

      let questions;
      try {
        const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        console.log('Cleaned content (first 200 chars):', cleanedContent.substring(0, 200));
        questions = JSON.parse(cleanedContent);
        console.log('Successfully parsed questions:', questions.questions?.length, 'questions');
      } catch (parseError) {
        console.error('Failed to parse quiz response:', parseError);
        console.error('Raw content:', content);
        throw new Error('Failed to parse AI response');
      }

      return new Response(JSON.stringify(questions), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Original yes/no quiz for non-startup programs
      console.log('Generating standard eligibility quiz');

      const prompt = `You are an expert at creating simple yes/no eligibility questionnaires.

Eligibility Criteria:
${eligibility}

Create a clear, step-by-step Yes/No questionnaire to help users determine if they're eligible. 

Rules:
- Ask 5-8 questions maximum
- Each question must be answerable with Yes or No
- Order from most general to most specific
- Cover all major eligibility requirements
- Be clear and conversational

Return JSON array:
[
  {
    "question": "Clear yes/no question?",
    "requirement": "What this checks"
  }
]

Focus on the most important eligibility criteria.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
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
            JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errorText = await response.text();
        console.error('AI error:', response.status, errorText);
        throw new Error(`AI request failed: ${response.status}`);
      }

      const data = await response.json();

      let quiz;
      try {
        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          quiz = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        throw new Error('Failed to parse AI response');
      }

      return new Response(
        JSON.stringify({ quiz }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in generate-eligibility-quiz:', error);
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