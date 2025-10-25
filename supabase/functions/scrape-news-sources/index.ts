import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callClaude } from "../_shared/claude-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function: Claude-powered intelligent discovery
async function discoverWithClaude(currentDateStr: string, lookbackDays: number): Promise<Array<{
  url: string;
  headline: string;
  published_date: string;
  source_name: string;
}>> {
  const timeframeText = lookbackDays === 1 
    ? 'the last 24 hours' 
    : lookbackDays === 7 
      ? 'the last 7 days' 
      : 'the last 30 days';

  const fallbackPrompt = `Search the web for government job notifications, exam announcements, and welfare schemes published in ${timeframeText} in India.

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

CRITICAL: Only include articles published in ${timeframeText}.
Return ONLY the JSON array, no markdown, no explanatory text.`;

  const response = await callClaude({
    systemPrompt: `You are a news discovery assistant specialized in finding recent government announcements.

CRITICAL RULES:
1. Return ONLY a JSON array, no text before or after
2. Only include articles from ${lookbackDays === 1 ? 'the last 24 hours' : lookbackDays === 7 ? 'the last 7 days' : 'the last 30 days'}
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

    // Filter based on lookback days
    const cutoffDate = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);
    return articles.filter(article => {
      if (!article.published_date) return false;
      try {
        const articleDate = new Date(article.published_date);
        return articleDate.getTime() > cutoffDate;
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

    let searchWindow = '24 hours'; // Declare at higher scope

    // Implement cascading time window search
    console.log('Starting multi-tier AI discovery...');
    
    try {
      const currentDate = new Date();
      const currentDateStr = currentDate.toISOString().split('T')[0];
      
      let allArticles: Array<{url: string; headline: string; published_date: string; source_name: string}> = [];

      // Tier 1: Try last 24 hours
      console.log('Tier 1: Searching last 24 hours...');
      const articles24h = await discoverWithClaude(currentDateStr, 1);
      console.log(`Found ${articles24h.length} articles from last 24 hours`);

      if (articles24h.length >= 5) {
        allArticles = articles24h;
        searchWindow = '24 hours';
      } else {
        // Tier 2: Expand to 7 days
        console.log('Tier 2: Expanding search to last 7 days...');
        allArticles = articles24h; // Keep fresh articles
        const articles7d = await discoverWithClaude(currentDateStr, 7);
        console.log(`Found ${articles7d.length} articles from last 7 days`);
        
        // Merge and deduplicate
        const uniqueUrls = new Set(allArticles.map(a => a.url));
        const newArticles = articles7d.filter(a => !uniqueUrls.has(a.url));
        allArticles = [...allArticles, ...newArticles];
        searchWindow = '7 days';
        
        if (allArticles.length < 3) {
          // Tier 3: Last resort - 30 days
          console.log('Tier 3: Expanding search to last 30 days...');
          const articles30d = await discoverWithClaude(currentDateStr, 30);
          console.log(`Found ${articles30d.length} articles from last 30 days`);
          
          const allUrls = new Set(allArticles.map(a => a.url));
          const moreArticles = articles30d.filter(a => !allUrls.has(a.url));
          allArticles = [...allArticles, ...moreArticles];
          searchWindow = '30 days';
        }
      }

      console.log(`Total unique articles discovered: ${allArticles.length}`);
      
      // Process discovered articles
      for (const article of allArticles) {
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
      ? `🤖 AI found ${results.found_articles} articles from the last ${searchWindow}`
      : 'No relevant articles found. Please try again later.';

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
