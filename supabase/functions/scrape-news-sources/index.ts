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
        console.log(`Scraping source: ${source.source_name} (${source.url})`);

        // Use Claude with web search to find recent articles
        const scrapePrompt = `Search for recent news articles (last 7 days) from this source: ${source.url}

Category focus: ${source.category}
${source.region !== 'National' ? `Region focus: ${source.region}` : ''}

Find 3-5 most recent and relevant articles about:
- Government exams (SSC, UPSC, Railway, Banking, State PSCs)
- Government job recruitments and vacancies
- Government schemes and welfare programs (PM schemes, State schemes)
- Important policy announcements affecting citizens

For each article found, return a JSON array with:
- url: Direct link to article
- headline: Article headline
- published_date: Publication date (ISO format if possible)

Return ONLY the JSON array, no extra text.`;

        const response = await callClaude({
          systemPrompt: 'You are a web scraping assistant. Find recent news articles from the provided source.',
          userPrompt: scrapePrompt,
          enableWebSearch: true,
          forceWebSearch: true,
          maxTokens: 2000,
          temperature: 0.1
        });

        // Parse articles from response
        let articles = [];
        try {
          let cleanContent = response.content.trim();
          cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
          articles = JSON.parse(cleanContent);
          
          if (!Array.isArray(articles)) {
            articles = [];
          }
        } catch (parseError) {
          console.error(`Failed to parse articles from ${source.source_name}:`, parseError);
          console.error('Raw content:', response.content);
          results.errors.push({
            source: source.source_name,
            error: 'JSON parse error'
          });
          continue;
        }

        console.log(`Found ${articles.length} articles from ${source.source_name}`);
        results.found_articles += articles.length;

        // Process each article with AI
        for (const article of articles) {
          try {
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
            }
          } catch (processError) {
            console.error(`Failed to process article ${article.url}:`, processError);
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Update source metrics
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
        console.error(`Error scraping ${source.source_name}:`, sourceError);
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

      // Delay between sources
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('Scraping complete:', results);

    return new Response(
      JSON.stringify({ 
        success: true,
        results
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
