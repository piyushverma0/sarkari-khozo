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
    const { query } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Processing query:', query);

    // Step 1: Extract application data using Claude with web search
    const extractionPrompt = `You are an expert at finding and extracting information about Indian government applications, exams, jobs, and schemes.

User Query: "${query}"

Your task:
1. If the query is a URL, extract information directly from that URL
2. If the query is a search term (like "SSC CGL 2024" or "PM Kisan Yojana"), first search the web to find the official government URL
3. Extract ALL key details from the official source

Return a JSON object with this exact structure:
{
  "title": "Official full title",
  "description": "Brief 2-3 sentence description",
  "url": "Official URL found or provided",
  "category": "One of: Students, Farmers, Senior Citizens, Health & Insurance, Women & Children, Jobs",
  "important_dates": [
    {"label": "Application Start", "date": "YYYY-MM-DD"},
    {"label": "Application End", "date": "YYYY-MM-DD"},
    {"label": "Exam Date", "date": "YYYY-MM-DD"}
  ],
  "eligibility": "Complete eligibility criteria as detailed text",
  "documents_required": ["Document 1", "Document 2"],
  "fee_structure": "Fee details as text",
  "application_steps": "Step by step application process"
}

Be thorough and extract ALL available information. For dates, always use YYYY-MM-DD format.`;

    const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        messages: [
          { role: 'user', content: extractionPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'web_search',
            description: 'Search the web for information',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' }
              },
              required: ['query']
            }
          }
        }],
        temperature: 0.3,
      }),
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error('AI extraction error:', extractionResponse.status, errorText);
      throw new Error(`AI extraction failed: ${extractionResponse.status}`);
    }

    const extractionData = await extractionResponse.json();
    console.log('Extraction response:', JSON.stringify(extractionData));

    let extractedInfo;
    try {
      const content = extractionData.choices[0].message.content;
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedInfo = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse extraction response:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Step 2: Generate document checklist
    const documents = extractedInfo.documents_required || [];
    const eligibility = extractedInfo.eligibility || '';
    
    const checklistPrompt = `Based on this application information:
Eligibility: ${eligibility}
Documents mentioned: ${documents.join(', ')}

Create a clean, comprehensive checklist of ALL required documents. Return as JSON array of strings:
["Document 1", "Document 2", "Document 3"]

Make it complete and well-organized.`;

    const checklistResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        messages: [{ role: 'user', content: checklistPrompt }],
        temperature: 0.2,
      }),
    });

    let documentChecklist = documents;
    if (checklistResponse.ok) {
      const checklistData = await checklistResponse.json();
      try {
        const content = checklistData.choices[0].message.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          documentChecklist = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Failed to parse checklist:', e);
      }
    }

    // Step 3: Generate deadline reminders if deadline exists
    let deadlineReminders = [];
    const deadlineDates = extractedInfo.important_dates?.filter((d: any) => 
      d.label.toLowerCase().includes('end') || 
      d.label.toLowerCase().includes('deadline') ||
      d.label.toLowerCase().includes('last date')
    );

    if (deadlineDates && deadlineDates.length > 0) {
      const deadline = deadlineDates[0].date;
      const reminderPrompt = `Create deadline reminder messages for: ${deadline}
      
Return JSON array with reminders for 7 days, 3 days, and 1 day before:
[
  {"days_before": 7, "message": "Reminder message"},
  {"days_before": 3, "message": "Reminder message"},
  {"days_before": 1, "message": "Urgent reminder message"}
]`;

      const reminderResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          messages: [{ role: 'user', content: reminderPrompt }],
          temperature: 0.3,
        }),
      });

      if (reminderResponse.ok) {
        const reminderData = await reminderResponse.json();
        try {
          const content = reminderData.choices[0].message.content;
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            deadlineReminders = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error('Failed to parse reminders:', e);
        }
      }
    }

    // Combine all data
    const result = {
      ...extractedInfo,
      documents_required: documentChecklist,
      deadline_reminders: deadlineReminders,
    };

    console.log('Final result:', JSON.stringify(result));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-query:', error);
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