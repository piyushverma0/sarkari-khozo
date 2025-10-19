import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
  currentProgram?: any;
  savedPrograms?: any[];
  searchResults?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, userId } = await req.json() as {
      message: string;
      context: ConversationContext;
      userId?: string;
    };

    console.log('Voice assistant received:', { message, context, userId });

    // Initialize Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Detect intent and take action
    const lowerMessage = message.toLowerCase();
    let actionTaken = null;
    let actionResult = null;

    // Handle search for programs
    if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('show me')) {
      if (lowerMessage.includes('startup')) {
        context.category = 'startup';
        // Extract state if mentioned
        const indianStates = ['karnataka', 'maharashtra', 'delhi', 'tamil nadu', 'kerala', 'gujarat', 'rajasthan', 'bihar', 'west bengal'];
        for (const state of indianStates) {
          if (lowerMessage.includes(state)) {
            context.state = state.charAt(0).toUpperCase() + state.slice(1);
            break;
          }
        }
      } else if (lowerMessage.includes('legal') || lowerMessage.includes('law')) {
        context.category = 'legal';
      } else if (lowerMessage.includes('scheme')) {
        context.category = 'scheme';
      } else if (lowerMessage.includes('exam')) {
        context.category = 'exam';
      }
    }

    // Handle save application
    if ((lowerMessage.includes('save') || lowerMessage.includes('track')) && context.currentProgram && userId) {
      try {
        const { error } = await supabase.from('applications').insert({
          user_id: userId,
          title: context.currentProgram.title,
          description: context.currentProgram.description,
          category: context.category,
          url: context.currentProgram.url,
          program_type: context.currentProgram.programType,
          funding_amount: context.currentProgram.fundingAmount,
        });

        if (!error) {
          actionTaken = 'save_application';
          actionResult = { success: true, program: context.currentProgram.title };
        }
      } catch (error) {
        console.error('Error saving application:', error);
      }
    }

    // Handle show saved programs
    if ((lowerMessage.includes('show') || lowerMessage.includes('list')) && 
        (lowerMessage.includes('saved') || lowerMessage.includes('tracked')) && userId) {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false })
          .limit(5);

        if (!error && data) {
          actionTaken = 'show_saved';
          actionResult = { programs: data };
        }
      } catch (error) {
        console.error('Error fetching saved programs:', error);
      }
    }

    // Handle remove application
    if (lowerMessage.includes('remove') || lowerMessage.includes('delete')) {
      const numberMatch = lowerMessage.match(/\d+/);
      if (numberMatch && context.savedPrograms && userId) {
        const index = parseInt(numberMatch[0]) - 1;
        if (index >= 0 && index < context.savedPrograms.length) {
          const programId = context.savedPrograms[index].id;
          try {
            const { error } = await supabase
              .from('applications')
              .delete()
              .eq('id', programId)
              .eq('user_id', userId);

            if (!error) {
              actionTaken = 'remove_application';
              actionResult = { success: true, program: context.savedPrograms[index].title };
            }
          } catch (error) {
            console.error('Error removing application:', error);
          }
        }
      }
    }

    // System prompt for voice assistant with Sakhi persona
    const systemPrompt = `You are Sakhi (meaning "friend" in Hindi), a warm and friendly voice assistant for FormVerse - India's platform for discovering government schemes, exams, startup programs, and legal opportunities.

Your Personality:
- Warm, conversational, and encouraging (not robotic)
- Patient and understanding of diverse Indian backgrounds
- Helpful and supportive, celebrating user progress
- Clear and concise (2-3 sentences max for voice)
- Use simple Indian English terminology

Your role:
- Help users find relevant programs through natural conversation
- Ask clarifying questions when needed (state, category, user type)
- Remember context from earlier in the conversation
- Celebrate actions: "Great choice!", "I've got that saved for you!"
- Be understanding with errors: "No worries, let me help you with that"

Available categories:
- Startups (idea/prototype/revenue stage)
- Legal (law students, lawyers, judiciary exams)
- Schemes (government welfare programs)
- Exams (competitive exams, applications)
- Farmers (agriculture schemes)

User types: students, professionals, entrepreneurs, farmers, lawyers

Conversational Guidelines:
- Greeting: Be warm and inviting
- Clarification: Confirm understanding politely
- Success: Celebrate the action clearly
- Error: Be patient and offer alternatives
- Always suggest helpful next steps

When user asks to search:
1. First check if they mentioned category/state before - reuse that context
2. Identify any NEW category or state mentioned
3. Ask for ONLY missing critical information politely
4. Present results conversationally: "I found 3 programs for you. The first is [name], which offers [key benefit]..."

When input is ambiguous:
- "Show me schemes" → "Sure! Which category interests you? Startups, Legal, Farmers, Exams, or Government Schemes?"
- "I'm a student" → "Great! Are you studying law, engineering, or in another field?"
- Use their previous context to narrow down options

When user refers to previous items:
- "What about the deadline?" → Use the last mentioned program
- "Also show me in Maharashtra" → Reuse the previous category/intent
- "Tell me about the second one" → Refer to previously shown programs

When user asks to take action (save, remove, remind):
1. Confirm the action warmly: "Perfect! I'm saving that for you now..."
2. Execute it if you have the information
3. Provide clear confirmation with encouragement: "All set! Your program is saved and you can find it anytime."

${actionTaken ? `\nRecent action completed: ${actionTaken} - ${JSON.stringify(actionResult)}` : ''}

Current conversation context: ${JSON.stringify({
  category: context.category,
  userType: context.userType,
  state: context.state,
  hasCurrentProgram: !!context.currentProgram,
  conversationLength: context.conversationHistory.length
})}

Remember: Keep it conversational, warm, and helpful. You're Sakhi - their friend in navigating opportunities!`;

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
    if (actionTaken === 'save_application') {
      responseType = 'confirmation';
    } else if (actionTaken === 'show_saved') {
      responseType = 'saved_programs';
    } else if (actionTaken === 'remove_application') {
      responseType = 'confirmation';
    } else if (aiResponse.toLowerCase().includes('?')) {
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
    } else if (responseType === 'search_results' || responseType === 'saved_programs') {
      suggestedFollowUps.push('Tell me about the first one', 'Save this program', 'Check eligibility');
    } else if (responseType === 'confirmation') {
      suggestedFollowUps.push('Show my saved programs', 'Find more programs', 'Anything else?');
    }

    return new Response(
      JSON.stringify({
        text: aiResponse,
        type: responseType,
        updatedContext,
        suggestedFollowUps,
        actionResult,
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
