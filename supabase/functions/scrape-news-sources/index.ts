import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callClaude } from "../_shared/claude-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting news source scraping...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch all active sources, prioritized
    const { data: sources, error: sourcesError } = await supabase
      .from('story_scraping_sources')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (sourcesError) throw sourcesError;

    console.log(`Found ${sources.length} active sources to scrape`);

    const results = {
      total_sources: sources.length,
      scraped: 0,
      found_articles: 0,
      processed: 0,
      errors: [] as Array<{ source: string; error: string }>
    };

    // Process each source
    for (const source of sources) {
      try {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] Starting scrape for ${source.source_name} (${source.url})`);

        // Get current date for explicit date filtering
        const currentDate = new Date();
        const threeDaysAgo = new Date(currentDate.getTime() - (3 * 24 * 60 * 60 * 1000));
        const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

        // Use Claude with web search to find recent articles
        const scrapePrompt = `Search the website ${source.url} for news articles published in the last 3 days.

CURRENT DATE: ${currentDateStr}
CRITICAL: Only return articles published between ${threeDaysAgoStr} and ${currentDateStr}

Category focus: ${source.category}
${source.region !== 'National' ? `Region focus: ${source.region}` : ''}

Find 3-5 MOST RECENT articles about:
- Government exams (SSC, UPSC, Railway, Banking, State PSCs)
- Government job recruitments and vacancies
- Government schemes and welfare programs (PM schemes, State schemes)
- Important policy announcements affecting citizens

For each article found, return a JSON array with:
- url: Direct link to article
- headline: Article headline
- published_date: Publication date in ISO format (YYYY-MM-DDTHH:mm:ssZ)

If you cannot find articles from the last 48 hours, return an empty array: []

CRITICAL: Return ONLY the JSON array itself, no explanatory text before or after.
Example: [{"url": "...", "headline": "...", "published_date": "2025-10-24T10:30:00Z"}]
Do not include markdown code blocks, do not include any commentary.`;

        const response = await callClaude({
          systemPrompt: `You are a web scraping assistant specialized in finding VERY RECENT news articles.

CRITICAL RULES:
1. Return ONLY a JSON array, no text before or after, no markdown code blocks
2. Only include articles from the last 3 days (${threeDaysAgoStr} to ${currentDateStr})
3. Each article MUST have a valid published_date in ISO format
4. If you cannot find recent articles, return an empty array []

Example correct response:
[{"url": "https://ssc.gov.in/article", "headline": "SSC Exam 2025", "published_date": "2025-10-24T10:30:00Z"}]`,
          userPrompt: scrapePrompt,
          enableWebSearch: true,
          forceWebSearch: true,
          maxTokens: 2000,
          temperature: 0.1
        });

        // Parse articles from response with robust extraction
        let articles = [];
        try {
          let cleanContent = response.content.trim();
          console.log(`[${new Date().toISOString()}] Claude response preview: ${cleanContent.substring(0, 300)}...`);

          // Strategy 1: Find JSON array between ```json and ```
          const jsonBlockMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonBlockMatch) {
            try {
              articles = JSON.parse(jsonBlockMatch[1]);
              console.log('Parsed articles (Strategy 1: markdown block)');
            } catch (e) {
              console.log('Strategy 1 failed, trying next...');
            }
          }

          // Strategy 2: Find JSON array pattern [...]
          if (!articles || articles.length === 0) {
            const arrayMatch = cleanContent.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
              try {
                articles = JSON.parse(arrayMatch[0]);
                console.log('Parsed articles (Strategy 2: array pattern)');
              } catch (e) {
                console.log('Strategy 2 failed, trying next...');
              }
            }
          }

          // Strategy 3: Remove everything before first [ and after last ]
          if (!articles || articles.length === 0) {
            const firstBracket = cleanContent.indexOf('[');
            const lastBracket = cleanContent.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
              try {
                articles = JSON.parse(cleanContent.substring(firstBracket, lastBracket + 1));
                console.log('Parsed articles (Strategy 3: bracket extraction)');
              } catch (e) {
                console.log('Strategy 3 failed');
              }
            }
          }
          
          if (!Array.isArray(articles)) {
            console.warn('Parsed result is not an array, defaulting to empty array');
            articles = [];
          }
        } catch (parseError) {
          console.error(`Failed to parse articles from ${source.source_name}:`, parseError);
          console.error('Raw content:', response.content);
          results.errors.push({
            source: source.source_name,
            error: 'JSON parse error after all strategies'
          });
          continue;
        }

        // Filter out old articles (only keep articles from last 7 days)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentArticles = articles.filter(article => {
          if (!article.published_date) {
            console.log(`Article missing published_date: ${article.headline}`);
            return false;
          }
          try {
            const articleDate = new Date(article.published_date);
            const daysOld = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysOld > 7) {
              console.log(`Filtering out old article (${daysOld.toFixed(1)} days old): ${article.headline}`);
              return false;
            }
            return true;
          } catch (e) {
            console.log(`Invalid date format for article: ${article.headline}`);
            return false;
          }
        });

        console.log(`[${new Date().toISOString()}] Found ${articles.length} articles, ${recentArticles.length} are recent (last 7 days)`);
        articles = recentArticles;
        results.found_articles += articles.length;

        // Process each article with AI
        for (const article of articles) {
          try {
            console.log(`[${new Date().toISOString()}] Processing article: ${article.headline.substring(0, 80)}...`);
            
            // Call process-story-with-ai function
            const processResponse = await supabase.functions.invoke('process-story-with-ai', {
              body: {
                url: article.url,
                raw_headline: article.headline,
                source_name: source.source_name,
                category: source.category === 'all' ? undefined : source.category
              }
            });

            if (processResponse.data?.success) {
              results.processed++;
              console.log(`[${new Date().toISOString()}] Successfully processed article`);
            } else {
              console.log(`[${new Date().toISOString()}] Failed to process: ${processResponse.error?.message || 'Unknown error'}`);
            }
          } catch (processError) {
            console.error(`Failed to process article ${article.url}:`, processError);
          }

          // Reduced delay to avoid rate limits (200ms instead of 500ms)
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Update source metrics
        const elapsed = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Completed ${source.source_name} in ${elapsed}ms`);
        
        await supabase
          .from('story_scraping_sources')
          .update({
            last_scraped_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            total_scrapes: source.total_scrapes + 1,
            success_count: source.success_count + 1,
            avg_articles_per_scrape: ((source.avg_articles_per_scrape || 0) * source.total_scrapes + articles.length) / (source.total_scrapes + 1)
          })
          .eq('id', source.id);

        results.scraped++;

      } catch (sourceError) {
        console.error(`[${new Date().toISOString()}] Error scraping ${source.source_name}:`, sourceError);
        const errorMessage = sourceError instanceof Error ? sourceError.message : 'Unknown error';
        results.errors.push({
          source: source.source_name,
          error: errorMessage
        });

        // Update source with error
        await supabase
          .from('story_scraping_sources')
          .update({
            last_scraped_at: new Date().toISOString(),
            total_scrapes: source.total_scrapes + 1,
            failure_count: source.failure_count + 1,
            last_error: errorMessage
          })
          .eq('id', source.id);
      }

      // Reduced delay between sources (1000ms instead of 2000ms)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[${new Date().toISOString()}] Scraping complete:`, results);

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scraping job failed:', error);
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
