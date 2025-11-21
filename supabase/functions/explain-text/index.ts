// Explain Text - AI-powered text explanations with web search
// Uses Claude Sonnet 4.5 with web capability for comprehensive explanations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExplainTextRequest {
  text: string
  context?: string // Optional context from the note
  note_id?: string // Optional note ID for logging
  user_id?: string // Optional user ID for logging
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, context, note_id, user_id }: ExplainTextRequest = await req.json()

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Explaining text:', text.substring(0, 100))

    // Build the explanation prompt
    const prompt = `You are an expert educator specializing in Indian government exams, jobs, and educational content. A student has selected the following text and wants a clear, comprehensive explanation.

SELECTED TEXT:
"${text}"

${context ? `\nCONTEXT (from study note):\n${context.substring(0, 1000)}` : ''}

EXPLANATION REQUIREMENTS:
1. **Clear Definition**: Start with a simple, clear explanation of what this is
2. **Detailed Breakdown**: Explain key concepts, terms, or processes mentioned
3. **Real-World Context**: Provide relevant examples or applications
4. **Exam Relevance**: If applicable, explain how this relates to exams/jobs
5. **Key Points**: Summarize the most important things to remember
6. **Related Information**: Use web search to find and include:
   - Current updates or changes
   - Official guidelines or rules
   - Recent notifications or amendments
   - Important deadlines or dates (if applicable)
   - Links to official sources

FORMATTING:
- Use clear headings and sections
- Highlight important terms with **bold**
- Use bullet points for lists
- Include examples where helpful
- Keep language simple and student-friendly
- Add ==highlights== for critical information

OUTPUT FORMAT: Return ONLY valid JSON (no markdown):
{
  "explanation": "Main explanation text with markdown formatting",
  "key_points": [
    "Key point 1",
    "Key point 2",
    "Key point 3"
  ],
  "examples": [
    {
      "title": "Example 1 title",
      "description": "Example description"
    }
  ],
  "related_info": {
    "current_updates": "Any recent changes or updates (if found via web search)",
    "official_links": [
      {
        "title": "Link title",
        "url": "https://...",
        "description": "What this link contains"
      }
    ]
  },
  "exam_tips": [
    "Tip 1 for exams",
    "Tip 2 for remembering this"
  ],
  "difficulty_level": "beginner" | "intermediate" | "advanced",
  "estimated_read_time": "X minutes"
}

IMPORTANT: Use the web_search tool if the text mentions:
- Specific government exams or jobs
- Dates, deadlines, or notifications
- Rules, regulations, or eligibility criteria
- Official schemes or policies
- Current events or recent updates

Current Date: ${new Date().toISOString()}

Remember: Return ONLY the JSON object.`

    // Call Claude API with web search capability
    console.log('Calling Claude API with web search...')
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        temperature: 0.3,
        system: 'You are an expert educator creating beautiful, comprehensive explanations. Always return valid JSON without markdown formatting or code blocks.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [
          {
            name: 'web_search',
            description: 'Search the web for current information about government exams, jobs, schemes, and official updates',
            input_schema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to find relevant information'
                }
              },
              required: ['query']
            }
          }
        ]
      })
    })

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text()
      console.error('Claude API error:', errorText)
      throw new Error(`Claude API error: ${errorText}`)
    }

    const anthropicData = await anthropicResponse.json()
    console.log('Claude explanation generation complete')

    // Extract response text (handle tool use if present)
    let responseText = ''
    if (anthropicData.content && anthropicData.content.length > 0) {
      for (const block of anthropicData.content) {
        if (block.type === 'text') {
          responseText += block.text
        }
      }
    }

    if (!responseText.trim()) {
      throw new Error('Empty response from Claude')
    }

    // Clean up response (remove markdown code blocks if present)
    let cleanedJson = responseText.trim()
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // Parse JSON
    let explanationData
    try {
      explanationData = JSON.parse(cleanedJson)
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError)
      console.error('Response text:', responseText.substring(0, 500))
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      throw new Error(`Failed to parse explanation: ${errorMessage}`)
    }

    console.log('Explanation generated successfully')

    // Optional: Log usage to database for analytics
    if (note_id && user_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // You could add a table to track explanation usage
        // await supabase.from('explanation_logs').insert({
        //   note_id,
        //   user_id,
        //   text_snippet: text.substring(0, 200),
        //   created_at: new Date().toISOString()
        // })
      } catch (logError) {
        console.error('Failed to log usage:', logError)
        // Don't fail the request if logging fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        selected_text: text,
        ...explanationData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in explain-text:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'

    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
