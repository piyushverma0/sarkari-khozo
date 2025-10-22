import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { programContext, conversationHistory, userMessage } = await req.json();

    console.log('Chat with program request:', { userMessage });

    const response = await callClaude({
      systemPrompt: `You are a helpful AI assistant specialized in Indian government startup programs. ${programContext}`,
      userPrompt: `${conversationHistory.map((m: any) => `${m.role}: ${m.content}`).join('\n')}\nuser: ${userMessage}`,
      enableWebSearch: false,
      temperature: 0.7,
    });

    logClaudeUsage('chat-with-program', response.tokensUsed, false);

    return new Response(
      JSON.stringify({ response: response.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-with-program:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Failed to process chat request'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
