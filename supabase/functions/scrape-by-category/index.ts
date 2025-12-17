import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callParallel } from "../_shared/parallel-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Category-specific search prompts for better diversity
const CATEGORY_PROMPTS = {
  'current-affairs': `Search for CURRENT AFFAIRS news from last 24 hours in India:
- Supreme Court rulings, High Court judgments
- Parliament bills, committee reports
- RBI monetary policy, economic data releases
- Major sports victories (cricket, Olympics, Asian Games)
- Scientific breakthroughs from ISRO, DRDO, IIT/IISc
- Environmental issues, climate policy
- Social movements, cultural events

Find 5-7 articles. Sources: The Hindu, Indian Express, PIB, PTI, Livemint`,

  'international': `Search for INTERNATIONAL news from last 3 days affecting India:
- G20, BRICS, WTO summits/meetings
- Trade deals, FTAs, tariff negotiations
- Border disputes, territorial issues
- Global economic impacts on India
- International sports where India participated
- Climate conferences, UN activities

Find 4-6 articles. Sources: MEA, The Hindu International, Reuters India, BBC`,

  'diplomatic': `Search for DIPLOMATIC news from last 3 days:
- State visits (PM/President/Foreign Minister)
- Bilateral treaties, MoUs signed
- India's stance at UN, WTO, WHO
- ASEAN, SAARC, SCO meetings
- Consular issues, visa policy changes
- Cultural diplomacy, soft power

Find 4-5 articles. Sources: Ministry of External Affairs, The Diplomat, PIB`,

  'education': `Search for EDUCATION news from last 7 days:
- NIRF rankings released
- IIT/IISc research publications, patents
- NEP 2020 implementation updates
- UGC, AICTE policy changes
- Scholarship announcements (national/state)
- University admissions, entrance exams
- EdTech regulations

Find 4-5 articles. Sources: UGC, AICTE, Education Ministry, university portals`,

  'exams': `Search for EXAM notifications from last 7 days:
- UPSC exam dates, admit cards, results
- SSC (CGL, CHSL, MTS) notifications
- Banking exams (IBPS, SBI, RBI)
- Railway recruitment (RRB, RRC)
- State PSC notifications
- Teaching exams (CTET, TET, NET/SET)

Find 5-7 articles. Sources: Sarkari Result, Jagran Josh, official websites`,

  'jobs': `Search for JOB notifications from last 7 days:
- PSU recruitment (NTPC, IOCL, ONGC, etc.)
- Central government job notifications
- State government recruitment
- Bank PO/Clerk positions
- Defence jobs (Army, Navy, Air Force civilian)
- Railway jobs

Find 5-7 articles. Sources: FreeJobAlert, Employment News, official portals`,

  'schemes': `Search for GOVERNMENT SCHEMES from last 7 days:
- New scheme launches (PM/CM schemes)
- Existing scheme updates, deadline extensions
- Subsidy programs for farmers, students, entrepreneurs
- Housing schemes (PMAY, etc.)
- Health schemes (Ayushman Bharat updates)
- Digital India initiatives

Find 4-5 articles. Sources: PIB, MyGov, ministry websites`,

  'policies': `Search for POLICY news from last 7 days:
- New regulations, ordinances
- Budget announcements, GST changes
- Agricultural policies, MSP updates
- Industry policies, PLI schemes
- Technology policies (5G, AI, data protection)
- Labor law changes

Find 4-5 articles. Sources: PIB, Gazette notifications, ministry portals`
};

async function discoverCategory(
  category: string,
  currentDate: string,
  maxArticles: number = 4
): Promise<Array<{ url: string; headline: string; published_date: string; source_name: string; category: string }>> {

  const categoryPrompt = CATEGORY_PROMPTS[category as keyof typeof CATEGORY_PROMPTS];
  if (!categoryPrompt) {
    console.warn(`Unknown category: ${category}`);
    return [];
  }

  const fullPrompt = `CURRENT DATE: ${currentDate}

${categoryPrompt}

IMPORTANT: Return ONLY ${maxArticles} high-quality, recent articles. Focus on quality over quantity.

Return a JSON array with:
- url: Full article URL
- headline: Article headline
- published_date: ISO format (YYYY-MM-DD)
- source_name: Publication name

ONLY return the JSON array, nothing else.`;

  const response = await callParallel({
    systemPrompt: `You are a news discovery assistant for Indian ${category} content.
Use web search to find recent, relevant articles.
Return ONLY a JSON array. No markdown, no explanations.`,
    userPrompt: fullPrompt,
    enableWebSearch: true,
    maxTokens: 2000,
    temperature: 0.1,
    jsonMode: true
  });

  console.log(`📊 [${category}] Response length: ${response.content.length} chars`);

  let articles = [];
  try {
    let cleanContent = response.content.trim();

    // Parse JSON
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
      console.warn(`⚠️ [${category}] Not an array`);
      return [];
    }

    // Add category to each article
    articles = articles.map(a => ({ ...a, category }));

    console.log(`✅ [${category}] Found ${articles.length} articles`);
    return articles;

  } catch (error) {
    console.error(`❌ [${category}] Parse error:`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categories } = await req.json().catch(() => ({}));
    const currentDate = new Date().toISOString().split('T')[0];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Query current category distribution to balance content
    const { data: categoryCounts } = await supabase
      .from('discovery_stories')
      .select('category')
      .eq('is_active', true);

    const countByCategory = (categoryCounts || []).reduce((acc: Record<string, number>, row: { category: string }) => {
      acc[row.category] = (acc[row.category] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Current category distribution:', countByCategory);

    // All available categories
    const allCategories = [
      'current-affairs',
      'international',
      'education',
      'diplomatic',
      'exams',
      'jobs',
      'schemes',
      'policies'
    ];

    // Sort categories by count (prioritize underrepresented ones)
    const sortedCategories = allCategories.sort((a, b) => {
      const countA = countByCategory[a] || 0;
      const countB = countByCategory[b] || 0;
      return countA - countB;
    });

    // Use provided categories or select balanced set
    let targetCategories: string[];
    if (categories && categories.length > 0) {
      targetCategories = categories;
    } else {
      // Prioritize underrepresented categories: take top 5 lowest + 1-2 from others
      targetCategories = [
        ...sortedCategories.slice(0, 5),  // 5 most underrepresented
        ...sortedCategories.slice(5, 7)   // 2 from the rest
      ];
    }

    console.log(`🎯 Starting balanced scraping for: ${targetCategories.join(', ')}`);
    console.log('📈 Priority order (least to most represented):', sortedCategories.map(c => `${c}(${countByCategory[c] || 0})`).join(', '));

    const allArticles: Array<{
      url: string;
      headline: string;
      published_date: string;
      source_name: string;
      category: string
    }> = [];

    // Search each category separately with limits
    for (const category of targetCategories) {
      const currentCount = countByCategory[category] || 0;

      // Adjust article limit based on current representation
      let maxArticles = 4; // default
      if (currentCount > 30) {
        maxArticles = 2; // reduce for overrepresented categories
      } else if (currentCount < 10) {
        maxArticles = 5; // boost for underrepresented categories
      }

      console.log(`📝 Scraping ${category} (current: ${currentCount}, max new: ${maxArticles})`);
      const articles = await discoverCategory(category, currentDate, maxArticles);
      allArticles.push(...articles);
    }

    console.log(`📚 Total articles discovered: ${allArticles.length}`);

    // Process each article
    let processed = 0;
    let skipped = 0;
    const errors = [];

    for (const article of allArticles) {
      try {
        console.log(`Processing: [${article.category}] ${article.headline}`);

        const { error: invokeError } = await supabase.functions.invoke('process-story-with-ai', {
          body: {
            url: article.url,
            raw_headline: article.headline,
            source_name: article.source_name,
            category: article.category
          }
        });

        if (invokeError) {
          console.error('Process error:', invokeError);
          errors.push({ article: article.headline, error: invokeError.message });
        } else {
          processed++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error('Article processing failed:', error);
        errors.push({
          article: article.headline,
          error: error instanceof Error ? error.message : String(error)
        });
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        discovered: allArticles.length,
        processed,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        by_category: targetCategories.reduce((acc: Record<string, number>, cat: string) => {
          acc[cat] = allArticles.filter(a => a.category === cat).length;
          return acc;
        }, {})
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Scrape-by-category error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
