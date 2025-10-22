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

    // Check if query is ambiguous (organization name without specific exam/scheme)
    const isAmbiguousQuery = /^(RRB|SSC|UPSC|IBPS|NEET|JEE|GATE|CSIR|UGC|DSSSB|ESIC|DRDO|ISRO|BARC|NIELIT|NTA|Railway|Banking|Civil\s*Service)$/i.test(query.trim());

    if (isAmbiguousQuery) {
      console.log('Detected ambiguous query, fetching multiple opportunities...');
      
      const disambiguationPrompt = `You are an expert at finding ALL active Indian government exams, jobs, and schemes for an organization.

User Query: "${query}"

Task: Find ALL current and recent exams/schemes/jobs from this organization. Search official government sources.

Return a JSON object with this EXACT structure:
{
  "is_ambiguous": true,
  "organization_name": "Full organization name (e.g., 'Railway Recruitment Board' for RRB, 'Staff Selection Commission' for SSC)",
  "active_opportunities": [
    {
      "title": "Exact official exam/scheme/job name",
      "description": "Brief 1-2 sentence description",
      "application_status": "Open" or "Closing Soon" or "Announced",
      "deadline": "YYYY-MM-DD format or 'Not yet announced'",
      "category": "One of: Students, Jobs, Farmers, Senior Citizens, Health & Insurance, Women & Children, Startups",
      "url": "Official URL if available"
    }
  ],
  "expired_opportunities": [
    {
      "title": "Exact official exam/scheme/job name",
      "description": "Brief 1-2 sentence description",
      "application_status": "Expired" or "Closed",
      "deadline": "YYYY-MM-DD format",
      "category": "One of: Students, Jobs, Farmers, Senior Citizens, Health & Insurance, Women & Children, Startups",
      "url": "Official URL if available"
    }
  ]
}

CRITICAL RULES:
- Find at least 5-10 opportunities per array (active and expired)
- Active = Application window is currently open OR will open soon
- Expired = Application deadline has passed in the last 6 months
- Use REAL data from official government sources (ssc.nic.in, rrbcdg.gov.in, upsc.gov.in, etc.)
- Be accurate with deadlines and status
- Include the official URL when available
- Sort active opportunities by deadline (soonest first)
- Sort expired opportunities by deadline (most recent first)`;

      const disambiguationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'user', content: disambiguationPrompt }
          ],
          temperature: 0.1,
        }),
      });

      if (!disambiguationResponse.ok) {
        const errorText = await disambiguationResponse.text();
        console.error('Disambiguation AI error:', disambiguationResponse.status, errorText);
        throw new Error(`Disambiguation failed: ${disambiguationResponse.status}`);
      }

      const disambiguationData = await disambiguationResponse.json();
      console.log('Disambiguation response:', JSON.stringify(disambiguationData));

      let disambiguationResult;
      try {
        const content = disambiguationData.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          disambiguationResult = JSON.parse(jsonMatch[0]);
          
          // Force is_ambiguous to true since we already detected it's an ambiguous query
          disambiguationResult.is_ambiguous = true;
        } else {
          throw new Error('No JSON found in disambiguation response');
        }
      } catch (parseError) {
        console.error('Failed to parse disambiguation response:', parseError);
        throw new Error('Failed to parse disambiguation response');
      }

      console.log('Returning disambiguation result:', JSON.stringify(disambiguationResult));
      return new Response(
        JSON.stringify(disambiguationResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if query is startup-related
    const isStartupQuery = /startup|funding|incubation|accelerator|dpiit|entrepreneur|venture|seed.*fund|grant.*program/i.test(query);

    // Single comprehensive extraction using AI with enhanced date extraction
    const comprehensivePrompt = `You are an expert at extracting information about Indian government applications, exams, jobs, and schemes${isStartupQuery ? ', with special expertise in startup programs and funding opportunities' : ''}.

User Query: "${query}"

${!isStartupQuery ? `
CRITICAL DATE EXTRACTION RULES (HIGHEST PRIORITY):
1. ALWAYS search these sources for dates (in priority order):
   - Official government website (ssc.nic.in, upsc.gov.in, rrbcdg.gov.in, ibps.in, railway.gov.in, etc.)
   - Sarkari Result (sarkariresult.com) - most reliable for exam dates
   - Testbook (testbook.com) - comprehensive date tracking
   - Careers360 (careers360.com) - verified exam information
   - Career Power (careerpower.in) - detailed exam schedules
   - Official notification PDFs from government portals
   - Times of India and Indian Express education sections

2. DATE EXTRACTION METHODOLOGY:
   - Search official notification PDFs first (look for "notification", "advertisement", "schedule")
   - Check exam calendar pages on official government portals
   - Look for "important dates" sections on official sites
   - Cross-verify dates from multiple reliable sources
   - If found on official website or 2+ reliable sources → confidence: "verified"
   - If found on 1 reliable source → confidence: "estimated"
   - If approximated from previous years → confidence: "tentative"
   - ONLY use "Not yet announced" if genuinely unavailable after checking ALL sources

3. DATE FORMAT HANDLING:
   - Accept multiple Indian date formats:
     * DD-MM-YYYY (15-05-2025)
     * DD/MM/YYYY (15/05/2025)
     * DD Month YYYY (15 May 2025)
     * Month DD, YYYY (May 15, 2025)
     * Month YYYY (May 2025 → use 01-05-2025)
   - Convert ALL dates to YYYY-MM-DD format in output
   - For date ranges like "15-05-2025 to 20-05-2025" → extract both start and end

4. KEY DATES TO EXTRACT:
   - application_start: When online registration opens
   - application_end: Last date to apply (deadline)
   - admit_card_date: When admit card is released/downloadable
   - exam_date: Actual exam/test date (if multiple phases, use first date)
   - result_date: When results are declared/announced
   - correction_window_start: Start of application correction period (if applicable)
   - correction_window_end: End of application correction period (if applicable)

5. CONFIDENCE SCORING:
   - "verified": Found on official government website OR found on 2+ reliable sources
   - "estimated": Found on 1 reliable source (like sarkariresult.com)
   - "tentative": Approximated based on previous year patterns

6. SOURCE ATTRIBUTION:
   - Always record the URL where dates were found in "date_source"
   - Prefer official government URLs over third-party sites
   - Set "last_verified" to current timestamp in ISO 8601 format
` : ''}

Your task:
1. If the query is a URL, extract information directly from that URL
2. If the query is a search term (like "SSC CGL 2024" or "PM Kisan Yojana"${isStartupQuery ? ' or "Startup India Seed Fund" or "NIDHI EIR"' : ''}), first search the web to find the official government URL
3. Extract ALL details from the official source - be thorough and accurate
${!isStartupQuery ? '4. For dates: Search ALL listed sources thoroughly before defaulting to "Not yet announced"' : ''}

Return a JSON object with this EXACT structure:
{
  "title": "Official full title of the scheme/exam/job",
  "description": "Brief 2-3 sentence description explaining what this is",
  "url": "Official URL (the actual government portal or official website)",
  "category": "One of: Students, Farmers, Senior Citizens, Health & Insurance, Women & Children, Jobs${isStartupQuery ? ', Startups' : ''}",
  
  "important_dates": {
    "application_start": "YYYY-MM-DD or 'Not yet announced'",
    "application_end": "YYYY-MM-DD or 'Not yet announced'",
    "admit_card_date": "YYYY-MM-DD or 'Not yet announced'${!isStartupQuery ? ' (only for exams)' : ''}",
    "exam_date": "YYYY-MM-DD or 'Not yet announced'${!isStartupQuery ? '' : ' (use null for non-exam programs)'}",
    "result_date": "YYYY-MM-DD or 'Not yet announced' (if applicable)"${!isStartupQuery ? `,
    "correction_window_start": "YYYY-MM-DD or null (if correction window exists)",
    "correction_window_end": "YYYY-MM-DD or null (if correction window exists)",
    "date_confidence": "verified or estimated or tentative",
    "date_source": "URL where dates were found (prefer official government site)",
    "last_verified": "Current timestamp in ISO 8601 format (e.g., 2025-05-16T10:00:00Z)"` : ''}
  },
  
  "eligibility": "Complete eligibility criteria as detailed text (age, education, etc.)",
  
  "fee_structure": "Fee details as text (different categories, payment methods, etc.)",
  
  "documents_required": [
    "Document 1 name (exactly as required by THIS specific scheme/exam)",
    "Document 2 name",
    "Document 3 name"
  ],
  
  "application_steps": "Brief overview of application process (kept for backwards compatibility)",
  
  "application_guidance": {
    "online_steps": [
      "Step 1: Specific action for THIS scheme (e.g., 'Visit ssc.nic.in' for SSC exams)",
      "Step 2: Include actual portal names, button names, URLs specific to THIS scheme",
      "Step 3: Registration details specific to THIS scheme",
      "Step 4: Payment/submission steps for THIS scheme"
    ],
    "csc_applicable": true or false (whether Common Service Centers can help with this application),
    "csc_guidance": "Specific CSC guidance for THIS scheme/exam, or empty string '' if not applicable",
    "state_officials_applicable": true or false (whether state government officials can assist),
    "state_officials_guidance": "Specific state official guidance for THIS scheme, or empty string '' if not applicable",
    "helpline": "ACTUAL helpline number(s) from THIS scheme's official source (not generic numbers)",
    "email": "ACTUAL contact email from THIS scheme's official source (not generic emails)",
    "estimated_time": "Realistic time estimate like '10-15 minutes' or '20-30 minutes'"
  },
  
  "deadline_reminders": [
    {"days_before": 7, "message": "7-day reminder message mentioning the scheme name"},
    {"days_before": 3, "message": "3-day reminder message"},
    {"days_before": 1, "message": "Urgent 1-day reminder message"}
  ]${isStartupQuery ? `,
  
  "program_type": "One of: grant, seed_funding, incubation, accelerator, policy_benefit, tax_benefit (only for startup programs)",
  "funding_amount": "Funding amount like '₹20-50 lakh' or '₹10 lakh' (only for funding programs)",
  "sector": "One of: Tech, AgriTech, HealthTech, FinTech, EdTech, E-commerce, CleanTech, All Sectors (only for startup programs)",
  "stage": "One of: Idea, Prototype, Revenue, Growth, All Stages (only for startup programs)",
  "state_specific": "State name if state-specific, otherwise 'All India' (only for startup programs)",
  "success_rate": "One of: High, Medium, Low - based on program popularity and approval rates (only for startup programs)",
  "dpiit_required": true or false - whether DPIIT recognition is required (only for startup programs)` : ''}
}

${!isStartupQuery ? `
EXAMPLE for SSC CPO 2025:
{
  "title": "SSC CPO SI - Sub-Inspector in Delhi Police, CAPFs and ASI in CISF Examination 2025",
  "important_dates": {
    "application_start": "2025-05-16",
    "application_end": "2025-06-15",
    "admit_card_date": "2025-08-20",
    "exam_date": "2025-09-01",
    "result_date": "Not yet announced",
    "correction_window_start": "2025-06-16",
    "correction_window_end": "2025-06-20",
    "date_confidence": "verified",
    "date_source": "https://ssc.nic.in/",
    "last_verified": "2025-05-16T10:00:00Z"
  }
}

EXAMPLE for UPSC CSE 2025:
{
  "title": "UPSC Civil Services Examination 2025",
  "important_dates": {
    "application_start": "2025-02-14",
    "application_end": "2025-03-05",
    "admit_card_date": "2025-05-15",
    "exam_date": "2025-06-08",
    "result_date": "Not yet announced",
    "correction_window_start": null,
    "correction_window_end": null,
    "date_confidence": "verified",
    "date_source": "https://upsc.gov.in/",
    "last_verified": "2025-02-14T09:00:00Z"
  }
}
` : ''}

CRITICAL RULES - IMPORTANT DATES FORMAT:
- important_dates MUST be an object with snake_case keys (not an array!)
- Use snake_case for keys: application_start, application_end, admit_card_date, exam_date, result_date, correction_window_start, correction_window_end
- Values should be "YYYY-MM-DD" format or "Not yet announced" for unreleased information
- For correction windows: use null if not applicable
${!isStartupQuery ? '- Include date_confidence, date_source, and last_verified fields' : ''}

CRITICAL RULES - CONTENT EXTRACTION:
- Extract information ONLY from the ACTUAL scheme/exam/job being queried
- For SSC CGL: Use SSC-specific details (ssc.nic.in portal, SSC helpline numbers, SSC email)
- For PM Kisan: Use PM Kisan-specific details (pmkisan.gov.in portal, PM Kisan helpline, PM Kisan email)
- For UPSC exams: Use UPSC-specific details (upsc.gov.in portal, UPSC contact info)${isStartupQuery ? `
- For Startup India Seed Fund: Use Startup India-specific details (startupindia.gov.in portal)
- For NIDHI programs: Use DST NIDHI-specific details (nidhi.dst.gov.in portal)
- For State Startup Missions: Use state-specific startup mission details` : ''}
- DO NOT mix information from different schemes (e.g., don't use PM Kisan details for SSC exams!)
- If information is not available for unreleased exams, use "Not yet announced" or "Check official website"
- For documents_required: List the EXACT documents this specific scheme asks for (not generic documents)
- For online_steps: Describe the EXACT registration process for this scheme's specific portal
- For helpline/email: Provide the ACTUAL contact details from the official source
- Be thorough, accurate, and scheme-specific in ALL fields!${isStartupQuery ? `
- For startup programs: Include all startup-specific fields (program_type, funding_amount, sector, stage, state_specific, success_rate, dpiit_required)
- Focus on government-backed startup programs, state startup missions, and official funding schemes` : ''}`;

    const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: comprehensivePrompt }
        ],
        temperature: 0.1, // Lower temperature for more deterministic extraction
      }),
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error('AI extraction error:', extractionResponse.status, errorText);
      throw new Error(`AI extraction failed: ${extractionResponse.status}`);
    }

    const extractionData = await extractionResponse.json();
    console.log('Comprehensive extraction response:', JSON.stringify(extractionData));

    let result;
    try {
      const content = extractionData.choices[0].message.content;
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse extraction response:', parseError);
      throw new Error('Failed to parse AI response');
    }

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