import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: string;
  content: string;
  timestamp: number;
}

interface ConversationContext {
  category?: string;
  userType?: string;
  state?: string;
  intent?: string;
  conversationHistory: Message[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json() as {
      message: string;
      context: ConversationContext;
    };

    console.log('Voice assistant received:', { message, context });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build conversation history for Gemini
    const conversationMessages = context.conversationHistory
      .slice(-10) // Keep last 10 messages for context
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    // Add current message
    conversationMessages.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // System prompt for voice assistant
    const systemPrompt = `You are Sakhi, a friendly voice assistant for FormVerse - a platform helping Indians discover and track government schemes, exams, startup programs, and legal opportunities.

Your role:
- Help users find relevant programs through natural conversation
- Ask clarifying questions when needed (state, category, user type)
- Keep responses concise for voice (2-3 sentences max)
- Use Indian context and terminology
- Be encouraging and supportive

Available categories:
- Startups (idea/prototype/revenue stage)
- Legal (law students, lawyers, judiciary exams)
- Schemes (government welfare programs)
- Exams (competitive exams, applications)
- Farmers (agriculture schemes)

User types: students, professionals, entrepreneurs, farmers, lawyers

When user asks to search:
1. Identify category and intent
2. Ask for missing context (state, user type, stage)
3. Provide guidance on what's available

When user asks to take action:
1. Confirm the action clearly
2. Provide clear confirmation

Always offer next steps or ask if they need more help.

Current context: ${JSON.stringify({
  category: context.category,
  userType: context.userType,
  state: context.state
})}`;

    // Call Gemini API
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
          ...conversationMessages.map(msg => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.parts[0].text
          }))
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            text: "I'm getting too many requests right now. Please try again in a moment.",
            type: 'error'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Gemini response:', aiResponse);

    // Extract updated context from response
    const updatedContext: Partial<ConversationContext> = { ...context };
    
    // Simple intent detection from AI response
    if (aiResponse.toLowerCase().includes('startup')) {
      updatedContext.category = 'startup';
    } else if (aiResponse.toLowerCase().includes('legal') || aiResponse.toLowerCase().includes('law')) {
      updatedContext.category = 'legal';
    } else if (aiResponse.toLowerCase().includes('exam')) {
      updatedContext.category = 'exam';
    } else if (aiResponse.toLowerCase().includes('scheme')) {
      updatedContext.category = 'scheme';
    }

    // Determine response type
    let responseType = 'information';
    if (aiResponse.toLowerCase().includes('?')) {
      responseType = 'clarification';
    } else if (aiResponse.toLowerCase().includes('found') || aiResponse.toLowerCase().includes('here are')) {
      responseType = 'search_results';
    } else if (aiResponse.toLowerCase().includes('set') || aiResponse.toLowerCase().includes('saved')) {
      responseType = 'confirmation';
    }

    // Generate suggested follow-ups
    const suggestedFollowUps: string[] = [];
    if (responseType === 'clarification') {
      suggestedFollowUps.push('Let me type instead', 'Tell me more');
    } else if (responseType === 'search_results') {
      suggestedFollowUps.push('Tell me about the first one', 'Show more options', 'Set a reminder');
    }

    return new Response(
      JSON.stringify({
        text: aiResponse,
        type: responseType,
        updatedContext,
        suggestedFollowUps,
        timestamp: Date.now()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Voice assistant error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        text: "I'm having trouble understanding. Could you please try again?",
        type: 'error',
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
