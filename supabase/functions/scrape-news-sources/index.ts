import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callClaude } from "../_shared/claude-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function: Claude-powered intelligent discovery
async function discoverWithClaude(currentDateStr: string): Promise<Array<{
  url: string;
  headline: string;
  published_date: string;
  source_name: string;
}>> {
  const fallbackPrompt = `Search the web for the LATEST government job notifications, exam announcements, and welfare schemes published in the last 24 hours in India.

CURRENT DATE: ${currentDateStr}

Find 5-10 MOST RECENT articles from any reputable Indian news aggregators about:
- Government job notifications (SSC, UPSC, Railway, Banking, State PSCs)
- Exam notifications and admit card releases  
- Government scheme launches or updates
- Policy announcements affecting citizens

Prioritize articles from these types of sources:
- Sarkari Result, FreeJobAlert, Jagran Josh, Employment News
- Major news outlets (Times of India, Hindustan Times, etc.)
- Official government portals

Return a JSON array with:
- url: Direct article link
- headline: Article headline  
- published_date: ISO format (YYYY-MM-DDTHH:mm:ssZ)
- source_name: Website name

CRITICAL: Only include articles published in the last 24 hours.
Return ONLY the JSON array, no markdown, no explanatory text.`;

  const response = await callClaude({
    systemPrompt: `You are a news discovery assistant specialized in finding recent government announcements.

CRITICAL RULES:
1. Return ONLY a JSON array, no text before or after
2. Only include articles from the last 24 hours
3. Each article MUST have url, headline, published_date, and source_name
4. If you cannot find recent articles, return an empty array []

Example correct response:
[{"url": "https://example.com/article", "headline": "SSC Exam 2025", "published_date": "2025-10-24T10:30:00Z", "source_name": "Sarkari Result"}]`,
    userPrompt: fallbackPrompt,
    enableWebSearch: true,
    forceWebSearch: true,
    maxTokens: 3000,
    temperature: 0.1
  });

  // Parse response
  let articles = [];
  try {
    let cleanContent = response.content.trim();
    
    // Try multiple parsing strategies
    const jsonBlockMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      articles = JSON.parse(jsonBlockMatch[1]);
    } else {
      const arrayMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        articles = JSON.parse(arrayMatch[0]);
      } else {
        const firstBracket = cleanContent.indexOf('[');
        const lastBracket = cleanContent.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
          articles = JSON.parse(cleanContent.substring(firstBracket, lastBracket + 1));
        }
      }
    }

    if (!Array.isArray(articles)) {
      console.warn('Fallback discovery: parsed result is not an array');
      return [];
    }

    // Filter to only last 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return articles.filter(article => {
      if (!article.published_date) return false;
      try {
        const articleDate = new Date(article.published_date);
        return articleDate.getTime() > oneDayAgo;
      } catch {
        return false;
      }
    });

  } catch (parseError) {
    console.error('Failed to parse fallback discovery response:', parseError);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting intelligent news discovery...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const results = {
      found_articles: 0,
      processed: 0,
      errors: [] as Array<{ source: string; error: string }>,
      discovery_method: 'claude_ai' as const
    };

    // Go straight to AI-powered discovery for fresh content
    console.log('Using AI discovery to find latest articles...');
    
    try {
      const currentDate = new Date();
      const currentDateStr = currentDate.toISOString().split('T')[0];
      
      const fallbackArticles = await discoverWithClaude(currentDateStr);
      console.log(`AI discovered ${fallbackArticles.length} articles`);
      
      // Process discovered articles
      for (const article of fallbackArticles) {
        try {
          console.log(`Processing: ${article.headline.substring(0, 80)}...`);
          
          const processResponse = await supabase.functions.invoke('process-story-with-ai', {
            body: {
              url: article.url,
              raw_headline: article.headline,
              source_name: article.source_name,
              category: undefined
            }
          });

          if (processResponse.data?.success) {
            results.processed++;
            results.found_articles++;
            console.log('✓ Article processed successfully');
          } else {
            console.log(`✗ Processing failed: ${processResponse.error?.message || 'Unknown error'}`);
          }
        } catch (processError) {
          console.error(`Failed to process article ${article.url}:`, processError);
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (discoveryError) {
      console.error('AI discovery failed:', discoveryError);
      results.errors.push({
        source: 'AI Discovery',
        error: discoveryError instanceof Error ? discoveryError.message : 'Discovery failed'
      });
    }

    console.log('Discovery complete:', results);

    const message = results.found_articles > 0
      ? `🤖 AI found ${results.found_articles} new articles from latest sources`
      : 'No new articles found in the last 24 hours. Check back soon!';

    return new Response(
      JSON.stringify({ 
        success: true,
        message,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Discovery failed:', error);
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
