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
    const { program } = await req.json();

    console.log('Generate document checklist for:', program.title);

    const prompt = `You are an expert at preparing application documents for Indian government startup programs and funding schemes.

Generate a comprehensive document checklist for this program:

Program: ${program.title}
Type: ${program.program_type || 'N/A'}
Funding: ${program.funding_amount || 'N/A'}
Sector: ${program.sector || 'All Sectors'}
Stage: ${program.stage || 'All Stages'}
Description: ${program.description}
Eligibility: ${program.eligibility || 'Not specified'}
Required Documents: ${program.documents_required ? JSON.stringify(program.documents_required) : 'Not specified'}

Generate a detailed document checklist in markdown format with sections: Essential Documents, Optional Documents, Pre-Submission Checklist, Pro Tips. Be specific, actionable, and comprehensive.`;

    const response = await callClaude({
      systemPrompt: 'You are a document preparation expert for Indian government programs.',
      userPrompt: prompt,
      enableWebSearch: true,
      maxWebSearchUses: 3,
      temperature: 0.3,
    });

    logClaudeUsage('generate-document-checklist', response.tokensUsed, response.webSearchUsed || false);

    return new Response(
      JSON.stringify({ checklist: response.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-document-checklist:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Failed to generate document checklist'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
