import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callClaude } from "../_shared/claude-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Discover exactly 3 high-priority articles to minimize API costs
async function discoverThreeArticles(currentDateStr: string): Promise<Array<{
  url: string;
  headline: string;
  published_date: string;
  source_name: string;
}>> {
  const prompt = `Search the web for exactly 3 HIGH-PRIORITY government-related news articles published in India in the last 24-48 hours.

CURRENT DATE: ${currentDateStr}

Find exactly 3 articles with this category distribution:
1. **ONE EXAM/JOBS article** - Government job notifications, exam results, admit cards (SSC, UPSC, Railway, Banking, CTET, etc.)
2. **ONE SCHEMES/POLICIES article** - New government schemes, policy updates, welfare programs, budget announcements
3. **ONE CURRENT AFFAIRS article** - Supreme Court rulings, Parliament news, RBI updates, important government decisions

PRIORITY SOURCES:
- Sarkari Result, Jagran Josh, FreeJobAlert (for jobs/exams)
- PIB Press Releases, The Hindu, Indian Express (for policies)
- Official government websites (.gov.in, .nic.in)

Return ONLY a JSON array with exactly 3 articles:
[
  {"url": "...", "headline": "...", "published_date": "YYYY-MM-DD", "source_name": "..."},
  {"url": "...", "headline": "...", "published_date": "YYYY-MM-DD", "source_name": "..."},
  {"url": "...", "headline": "...", "published_date": "YYYY-MM-DD", "source_name": "..."}
]

CRITICAL: Return ONLY the JSON array, no markdown, no explanation. Maximum 3 articles.`;

  const response = await callClaude({
    systemPrompt: `You are a news discovery assistant. Use web search to find exactly 3 high-priority government news articles from India. Return ONLY a JSON array with 3 articles. No more, no less.`,
    userPrompt: prompt,
    enableWebSearch: true,
    forceWebSearch: true,
    maxTokens: 1500,
    temperature: 0.1
  });

  console.log(`📊 Claude response length: ${response.content.length} chars`);
  console.log(`🔍 Web search used: ${response.webSearchUsed}`);
  console.log(`📝 Raw response: ${response.content.substring(0, 500)}...`);

  let articles = [];
  try {
    let cleanContent = response.content.trim();
    
    // Parse JSON response
    const jsonBlockMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      articles = JSON.parse(jsonBlockMatch[1]);
    } else {
      const arrayMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        articles = JSON.parse(arrayMatch[0]);
      }
    }

    if (!Array.isArray(articles)) {
      console.warn('⚠️ Parsed result is not an array');
      return [];
    }

    // Limit to exactly 3 articles
    articles = articles.slice(0, 3);
    console.log(`✅ Parsed ${articles.length} articles`);

    return articles;

  } catch (parseError) {
    console.error('❌ Failed to parse Claude response:', parseError);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily news discovery (limited to 3 articles)...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const results = {
      found_articles: 0,
      processed: 0,
      errors: [] as Array<{ source: string; error: string }>,
      discovery_method: 'claude_ai_limited' as const
    };

    try {
      const currentDate = new Date();
      const currentDateStr = currentDate.toISOString().split('T')[0];
      
      // Single API call to get exactly 3 articles
      console.log('Discovering 3 high-priority articles...');
      const articles = await discoverThreeArticles(currentDateStr);
      console.log(`Found ${articles.length} articles`);

      // Process discovered articles
      for (const article of articles) {
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
          results.errors.push({
            source: article.url,
            error: processError instanceof Error ? processError.message : 'Processing failed'
          });
        }

        // Small delay between processing
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (discoveryError) {
      console.error('AI discovery failed:', discoveryError);
      results.errors.push({
        source: 'AI Discovery',
        error: discoveryError instanceof Error ? discoveryError.message : 'Discovery failed'
      });
    }

    console.log('Daily discovery complete:', results);

    const message = results.found_articles > 0
      ? `🤖 AI discovered and processed ${results.found_articles} articles today`
      : 'No relevant articles found today.';

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
