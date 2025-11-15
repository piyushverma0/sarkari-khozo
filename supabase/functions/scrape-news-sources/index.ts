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

  const fallbackPrompt = `Search the web for news published in ${timeframeText} in India. Find 15-20 RECENT articles covering DIVERSE categories:

CURRENT DATE: ${currentDateStr}

CATEGORY DISTRIBUTION (aim for 3-4 articles per category):

1. **CURRENT AFFAIRS** (Supreme Court rulings, Parliament bills, RBI monetary policy, sports victories, scientific discoveries):
   Sources: The Hindu, Indian Express, PIB Press Releases, PTI

2. **INTERNATIONAL NEWS** (G20 summits, trade deals, border issues, global events affecting India):
   Sources: MEA website, The Hindu International, BBC, Reuters India

3. **DIPLOMATIC** (State visits, bilateral treaties, UN/WTO activities, BRICS/ASEAN meetings):
   Sources: Ministry of External Affairs, The Diplomat, UN News

4. **EDUCATION** (NIRF rankings, IIT/IISc research, NEP updates, scholarship announcements):
   Sources: UGC, AICTE, Education Ministry, university news portals

5. **EXAMS** (UPSC/SSC/Banking exam notifications, admit cards, results):
   Sources: Sarkari Result, Jagran Josh, official board websites

6. **JOBS** (Government recruitment drives, PSU hiring, state job notifications):
   Sources: FreeJobAlert, Employment News, official recruitment portals

Return JSON array with url, headline, published_date (ISO format), source_name.
ONLY include articles from ${timeframeText}. Ensure DIVERSE category coverage.`;

  const response = await callClaude({
    systemPrompt: `You are a news discovery assistant. When given a search request:

1. ALWAYS use the web_search tool to find articles
2. Search Indian government job portals, news sites, and official sources
3. Return articles as a JSON array with url, headline, published_date (ISO format), source_name
4. If you find articles but dates are unclear, estimate based on "X days ago" text or context
5. If you cannot find ANY articles, return [] (empty array)

CRITICAL: Return ONLY the JSON array, nothing else. No markdown, no explanation.`,
    userPrompt: fallbackPrompt,
    enableWebSearch: true,
    forceWebSearch: true,
    maxTokens: 3000,
    temperature: 0.1
  });

  // Diagnostic logging
  console.log(`📊 Claude response length: ${response.content.length} chars`);
  console.log(`🔍 Web search used: ${response.webSearchUsed}`);
  console.log(`📝 Raw Claude response preview: ${response.content.substring(0, 500)}...`);

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
      console.warn('⚠️ Parsed result is not an array');
      return [];
    }

    console.log(`📚 Parsed ${articles.length} articles before date filtering`);

    // Filter based on lookback days
    const cutoffDate = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);
    const filteredArticles = articles.filter(article => {
      if (!article.published_date) {
        console.warn(`⚠️ Article missing published_date: ${article.headline?.substring(0, 50)}`);
        return false;
      }
      try {
        const articleDate = new Date(article.published_date);
        const isRecent = articleDate.getTime() > cutoffDate;
        if (!isRecent) {
          console.log(`🗓️ Filtered out (too old): ${article.headline?.substring(0, 50)} - ${article.published_date}`);
        }
        return isRecent;
      } catch (error) {
        console.warn(`⚠️ Invalid date format for: ${article.headline?.substring(0, 50)} - ${article.published_date}`);
        return false;
      }
    });

    console.log(`✅ After date filtering: ${filteredArticles.length} articles remain`);
    if (filteredArticles.length === 0 && articles.length > 0) {
      console.warn(`⚠️ All ${articles.length} articles were filtered out by date constraints`);
    }

    return filteredArticles;

  } catch (parseError) {
    console.error('❌ Failed to parse Claude response:', parseError);
    console.error('Raw response:', response.content);
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

          // Tier 4: Absolute fallback - broad evergreen search
          if (allArticles.length === 0) {
            console.log('Tier 4: Trying broad evergreen search...');
            const broadPrompt = `Find highly relevant recent or evergreen articles about:
- Government job notifications in India (SSC, UPSC, Railway, Banking exams)
- Important government schemes and welfare programs
- Major policy announcements

Return 5-10 articles with url, headline, published_date (estimate if unclear), source_name.
Return ONLY the JSON array.`;

            const broadResponse = await callClaude({
              systemPrompt: `You are a news discovery assistant. Use web search to find relevant articles. Return ONLY a JSON array.`,
              userPrompt: broadPrompt,
              enableWebSearch: true,
              forceWebSearch: true,
              maxTokens: 3000,
              temperature: 0.3
            });

            console.log(`🔄 Tier 4 response: ${broadResponse.content.substring(0, 300)}...`);
            
            try {
              let broadContent = broadResponse.content.trim();
              const jsonMatch = broadContent.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                const broadArticles = JSON.parse(jsonMatch[0]);
                if (Array.isArray(broadArticles)) {
                  console.log(`Found ${broadArticles.length} evergreen articles`);
                  allArticles = broadArticles;
                  searchWindow = 'evergreen content';
                }
              }
            } catch (e) {
              console.error('Failed to parse Tier 4 results:', e);
            }
          }
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
