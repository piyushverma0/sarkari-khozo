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
    console.log('Starting news source scraping (background task)...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Define the background scraping task
    const scrapingTask = async () => {
      const results = {
        total_sources: 0,
        scraped: 0,
        found_articles: 0,
        processed: 0,
        errors: [] as Array<{ source: string; error: string }>,
        discovery_method: 'configured_sources' as 'configured_sources' | 'claude_fallback'
      };

      try {
        // Fetch all active sources
        const { data: sources, error: sourcesError } = await supabase
          .from('story_scraping_sources')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .limit(10);

        if (sourcesError) {
          console.error('Error fetching sources:', sourcesError);
          return;
        }

        console.log(`Found ${sources.length} active sources to scrape`);
        results.total_sources = sources.length;

        // Process each source without timeout constraints
        for (const source of sources) {
          try {
            const startTime = Date.now();
            console.log(`[${new Date().toISOString()}] Starting scrape for ${source.source_name} (${source.url})`);

            const currentDate = new Date();
            const threeDaysAgo = new Date(currentDate.getTime() - (3 * 24 * 60 * 60 * 1000));
            const currentDateStr = currentDate.toISOString().split('T')[0];
            const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

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

            let articles = [];
            try {
              let cleanContent = response.content.trim();
              console.log(`[${new Date().toISOString()}] Claude response preview: ${cleanContent.substring(0, 300)}...`);

              const jsonBlockMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
              if (jsonBlockMatch) {
                try {
                  articles = JSON.parse(jsonBlockMatch[1]);
                  console.log('Parsed articles (Strategy 1: markdown block)');
                } catch (e) {
                  console.log('Strategy 1 failed, trying next...');
                }
              }

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
              results.errors.push({
                source: source.source_name,
                error: 'JSON parse error after all strategies'
              });
              continue;
            }

            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const recentArticles = articles.filter(article => {
              if (!article.published_date) return false;
              try {
                const articleDate = new Date(article.published_date);
                const daysOld = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysOld <= 7;
              } catch (e) {
                return false;
              }
            });

            console.log(`[${new Date().toISOString()}] Found ${articles.length} articles, ${recentArticles.length} are recent (last 7 days)`);
            articles = recentArticles;
            results.found_articles += articles.length;

            for (const article of articles) {
              try {
                console.log(`[${new Date().toISOString()}] Processing article: ${article.headline.substring(0, 80)}...`);
                
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

              await new Promise(resolve => setTimeout(resolve, 200));
            }

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

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Intelligent Discovery Fallback - trigger when no articles found
        if (results.found_articles === 0) {
          console.log('No articles found from configured sources. Activating Claude discovery fallback...');
          
          try {
            const currentDate = new Date();
            const currentDateStr = currentDate.toISOString().split('T')[0];
            
            const fallbackArticles = await discoverWithClaude(currentDateStr);
            console.log(`Claude fallback discovered ${fallbackArticles.length} articles`);
            
            for (const article of fallbackArticles) {
              try {
                console.log(`Processing fallback article: ${article.headline.substring(0, 80)}...`);
                
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
                  console.log('Successfully processed fallback article');
                }
              } catch (processError) {
                console.error(`Failed to process fallback article ${article.url}:`, processError);
              }

              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            if (results.found_articles > 0) {
              results.discovery_method = 'claude_fallback';
            }
          } catch (fallbackError) {
            console.error('Claude fallback discovery failed:', fallbackError);
            results.errors.push({
              source: 'Claude Fallback',
              error: fallbackError instanceof Error ? fallbackError.message : 'Fallback discovery failed'
            });
          }
        }

        console.log(`[${new Date().toISOString()}] Scraping complete:`, results);

      } catch (error) {
        console.error('Background scraping task failed:', error);
      }
    };

    // Start background task
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(scrapingTask());

    // Return immediate response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'News scraping started in background. Results will be available shortly.',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Failed to start scraping task:', error);
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
