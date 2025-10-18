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
    const { program } = await req.json();

    console.log('Generate document checklist for:', program.title);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

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

Generate a detailed document checklist in this exact markdown format:

# Document Checklist for ${program.title}

## Essential Documents

### 1. [Document Name]
**Purpose:** Brief explanation of why this document is needed

**Where to Get It:**
- Detailed instructions on obtaining this document
- Relevant portal URLs or office locations
- Processing time if applicable

**Common Mistakes to Avoid:**
- Specific mistake 1
- Specific mistake 2

**Template/Format:**
- Link to template if available (use placeholder URL: https://example.com/template)
- Specific format requirements (e.g., PDF only, max 2MB)

---

[Repeat for each document - aim for 5-8 essential documents]

## Optional Documents (Can Strengthen Your Application)

### [Document Name]
**Why It Helps:** Explanation of how this strengthens the application

**How to Prepare:**
- Step-by-step guidance

---

## Pre-Submission Checklist

- [ ] All documents are in the correct format (PDF/JPG)
- [ ] File sizes are within limits
- [ ] Documents are clearly labeled
- [ ] All signatures and stamps are in place
- [ ] Self-attestation done where required
- [ ] Documents are arranged in the order specified

## Pro Tips

- **Timing:** Best time to apply is [when]
- **Common Rejections:** [reasons applications typically get rejected]
- **Success Rate Boosters:** [specific tips for this program]

Be specific to this program. Include actual government portals and realistic advice. Make it actionable and comprehensive.`;

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
        temperature: 0.3,
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
    const checklist = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ checklist }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
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
