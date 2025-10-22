import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { messages } = await req.json();

    const systemPrompt = `You are a friendly CSC Locator Assistant helping users find their nearest Common Service Centre (CSC) in India.

Your job:
1. Ask for their State (if not provided)
2. Ask for their District or City (if not provided)
3. Once you have both, provide a helpful response with:
   - Acknowledge the location
   - Suggest searching "Common Service Centre [District], [State]" on Google Maps
   - Mention they can also ask at their local Panchayat office
   - Provide general CSC timings: 10 AM - 5 PM (Mon-Sat)

Keep your tone:
- Friendly and conversational
- Use light emoji (👍, 📍, 🏢) to make it warm
- Ask one question at a time
- Be helpful and encouraging

If the user mentions a village or rural area, also suggest visiting their local Panchayat office or Village Level Entrepreneur (VLE).`;

    const response = await callClaude({
      systemPrompt,
      userPrompt: messages.map((m: any) => `${m.role}: ${m.content}`).join('\n'),
      enableWebSearch: true,
      maxWebSearchUses: 3,
      temperature: 0.7,
    });

    logClaudeUsage('find-nearest-csc', response.tokensUsed, response.webSearchUsed || false);

    return new Response(
      JSON.stringify({ message: response.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in find-nearest-csc:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
