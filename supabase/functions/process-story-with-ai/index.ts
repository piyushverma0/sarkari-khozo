import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
    const { url, raw_headline, source_name, category } = await req.json();

    console.log('Processing story:', { url, raw_headline, source_name });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if story already exists
    const { data: existingStory } = await supabase
      .from('discovery_stories')
      .select('id')
      .eq('source_url', url)
      .maybeSingle();

    if (existingStory) {
      console.log('Story already exists, skipping:', url);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Story already exists',
          story_id: existingStory.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Claude Prompt
    const systemPrompt = `You are an expert Indian news analyst specializing in government schemes, competitive exams, public sector jobs, current affairs, international relations, and education.

CRITICAL: Your response MUST be ONLY valid JSON with no explanatory text, no markdown formatting, no commentary before or after.
Return ONLY the JSON object itself, nothing else.

Your task is to analyze news articles and extract key information for Indian citizens including students, job seekers (Group D to Group A), teachers, and those preparing for competitive exams like UPSC, SSC, Banking, Railway.

Focus on:
- Clear, actionable information (dates, deadlines, eligibility)
- Benefits and impact for common citizens
- State/region-specific details if applicable
- For current affairs: Key facts, dates, names for exam preparation
- For international news: India's involvement or impact on India
- For diplomatic news: Strategic significance for India
- For education: Opportunities for Indian students and institutions
- Avoiding jargon, using simple Hindi-English terms where needed`;

    const userPrompt = `Article URL: ${url}
${raw_headline ? `Headline: ${raw_headline}` : ''}
${source_name ? `Source: ${source_name}` : ''}
${category ? `Expected Category: ${category}` : ''}

Please analyze this article and provide a JSON response with the following fields:

1. **headline**: Clear, concise headline (max 80 characters, avoid clickbait)
2. **summary**: 50-100 word summary highlighting:
   - Key dates/deadlines (if any)
   - Eligibility criteria (if applicable)
   - Benefits or impact
   - How to apply/act (if relevant)
3. **category**: MUST be one of: "exams", "jobs", "schemes", "policies", "current-affairs", "international", "education", "diplomatic"
   - Use "current-affairs" for: National news, economy, sports, science, environment, social issues
   - Use "international" for: Global news with India relevance, foreign policy
   - Use "education" for: University news, research, education policy, scholarships
   - Use "diplomatic" for: Bilateral relations, treaties, state visits, multilateral forums
4. **subcategory**: Specific type (e.g., "SSC Exam", "Railway Recruitment", "PM Kisan Scheme", "Budget Announcement")
5. **tags**: Array of 5-8 relevant keywords (use common search terms, include Hindi transliterations if needed)
6. **region**: 
   - "National" if applies to all of India
   - Specific state name(s) if region-specific
   - Format: "Maharashtra" or "UP, Bihar" for multiple states
7. **states**: Array of state names if region-specific, empty array if National
8. **impact_statement**: One sentence (max 120 chars) explaining why this matters to users
   - Start with action or benefit
   - Example: "New scheme provides ₹6000/year to farmers nationwide"
9. **key_takeaways**: Array of 3-5 bullet points, each max 100 chars
   - Focus on most important/actionable information
   - Include dates, amounts, eligibility in simple terms
10. **relevance_score**: Rate 0-10 based on category:
    
    **For exams/jobs/schemes/policies:**
    - Recency: Within 7 days = +3, 7-14 days = +2, 14-30 days = +1
    - Clarity: Clear dates/deadlines = +2
    - Actionability: Clear steps to apply/benefit = +2
    - Audience size: National = +2, Multi-state = +1, Single state = 0
    - Impact: High monetary benefit or major opportunity = +1
    
    **For current-affairs:**
    - Recency: Within 24h = +3, 3 days = +2, 7 days = +1
    - Exam relevance: UPSC/SSC important = +3, Banking/Railway = +2, General = +1
    - Source credibility: Government/PIB = +2, Major outlet = +1
    - Factual content: Key dates/names/facts = +2
    
    **For international/diplomatic:**
    - India involvement: Direct = +4, Economic impact = +3, Regional = +2, General = +1
    - Recency: Within 3 days = +2, 7 days = +1
    - Exam importance: UPSC relevant = +2
    - Source: Official MEA/UN = +1
    
    **For education:**
    - Impact: National policy = +3, Major university = +2, General = +1
    - Opportunity: Scholarship/admission = +2
    - Recency: Within 7 days = +2, 14 days = +1
    - Relevance: Students/teachers = +2
11. **published_date**: Extract publication date in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
    - If not found, use current date
12. **image_url**: Extract featured image URL if available, else null
13. **excerpt**: First 200 characters of the article for previews

**Important Guidelines**:
- If relevance_score < 3, still return the data but note low relevance
- If article is behind paywall or cannot be accessed, return null for content fields
- Use simple language suitable for readers with varying education levels
- For dates, always specify the year (e.g., "March 15, 2025" not just "March 15")
- For monetary amounts, use ₹ symbol and lakhs/crores (Indian numbering)

CRITICAL: Return ONLY valid JSON with no explanatory text.
Format: {"headline": "...", "summary": "...", ...}
Do not include markdown code blocks, do not include any text before or after the JSON.`;

    // Call Claude with web search (with retry logic)
    const MAX_RETRIES = 3;
    let response;
    let storyData;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Calling Claude API with web search (attempt ${attempt}/${MAX_RETRIES})...`);
        response = await callClaude({
          systemPrompt,
          userPrompt,
          enableWebSearch: true,
          forceWebSearch: true,
          maxTokens: 2500,
          temperature: 0.3
        });

        console.log('Claude response received, tokens used:', response.tokensUsed);

        // Log Claude usage
        await logClaudeUsage('process-story-with-ai', response.tokensUsed, response.webSearchUsed || false);

        // Parse JSON response with multiple extraction strategies
        let cleanContent = response.content.trim();

        // Strategy 1: Find JSON between ```json and ```
        const jsonBlockMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
          try {
            storyData = JSON.parse(jsonBlockMatch[1]);
            console.log('Successfully parsed JSON (Strategy 1: markdown block)');
            break;
          } catch (e) {
            console.log('Strategy 1 failed, trying next...');
          }
        }

        // Strategy 2: Find JSON object pattern (starts with { and ends with })
        if (!storyData) {
          const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              storyData = JSON.parse(jsonMatch[0]);
              console.log('Successfully parsed JSON (Strategy 2: object pattern)');
              break;
            } catch (e) {
              console.log('Strategy 2 failed, trying next...');
            }
          }
        }

        // Strategy 3: Remove everything before first { and after last }
        if (!storyData) {
          const firstBrace = cleanContent.indexOf('{');
          const lastBrace = cleanContent.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            try {
              storyData = JSON.parse(cleanContent.substring(firstBrace, lastBrace + 1));
              console.log('Successfully parsed JSON (Strategy 3: brace extraction)');
              break;
            } catch (e) {
              console.log('Strategy 3 failed');
            }
          }
        }

        if (!storyData) {
          throw new Error('All JSON extraction strategies failed');
        }

        break; // Success, exit retry loop

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt < MAX_RETRIES) {
          const delayMs = 1000 * attempt;
          console.log(`Retry attempt ${attempt}/${MAX_RETRIES} after ${delayMs}ms`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          console.error('All retry attempts failed');
          console.error('Raw content:', response?.content);
          throw new Error('Invalid JSON response from AI after all retries');
        }
      }
    }

    // Strip cite tags from all text fields
    const stripCiteTags = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.replace(/<cite[^>]*>/g, '').replace(/<\/cite>/g, '');
      }
      if (Array.isArray(obj)) {
        return obj.map(item => stripCiteTags(item));
      }
      if (obj && typeof obj === 'object') {
        const cleaned: any = {};
        for (const key in obj) {
          cleaned[key] = stripCiteTags(obj[key]);
        }
        return cleaned;
      }
      return obj;
    };

    const cleanedData = stripCiteTags(storyData);

    // Validate required fields
    if (!cleanedData.headline || !cleanedData.summary || !cleanedData.category) {
      throw new Error('Missing required fields in AI response');
    }

    // Validate category
    const validCategories = ['exams', 'jobs', 'schemes', 'policies', 'current-affairs', 'international', 'education', 'diplomatic'];
    if (!validCategories.includes(cleanedData.category)) {
      console.warn('Invalid category, defaulting to "policies":', cleanedData.category);
      cleanedData.category = 'policies';
    }

    // Check relevance score
    if (cleanedData.relevance_score < 3) {
      console.log('Low relevance score, skipping save:', cleanedData.relevance_score);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Story relevance too low',
          relevance_score: cleanedData.relevance_score 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Prepare story record
    const storyRecord = {
      headline: cleanedData.headline.substring(0, 200),
      summary: cleanedData.summary,
      excerpt: cleanedData.excerpt || cleanedData.summary.substring(0, 200),
      source_url: url,
      source_name: source_name || cleanedData.source_name || 'Unknown',
      published_date: cleanedData.published_date || new Date().toISOString(),
      category: cleanedData.category,
      subcategory: cleanedData.subcategory || null,
      tags: cleanedData.tags || [],
      region: cleanedData.region || 'National',
      states: cleanedData.states || [],
      image_url: cleanedData.image_url || null,
      image_alt: cleanedData.headline,
      relevance_score: cleanedData.relevance_score || 5,
      impact_statement: cleanedData.impact_statement || null,
      key_takeaways: cleanedData.key_takeaways || [],
      is_active: true,
      scraped_at: new Date().toISOString()
    };

    // Insert into database
    const { data: savedStory, error: saveError } = await supabase
      .from('discovery_stories')
      .insert(storyRecord)
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save story:', saveError);
      throw saveError;
    }

    console.log('Story saved successfully:', savedStory.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        story_id: savedStory.id,
        relevance_score: cleanedData.relevance_score 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing story:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
