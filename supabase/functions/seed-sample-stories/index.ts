import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Seeding sample stories...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Sample stories covering different categories and regions
    const sampleStories = [
      {
        headline: "UPSC Civil Services 2025: Application Process Begins",
        summary: "The Union Public Service Commission has announced the opening of applications for the Civil Services Examination 2025. Candidates can apply online from today.",
        excerpt: "UPSC invites applications for IAS, IPS, IFS and other central services. The preliminary examination is scheduled for May 2025.",
        source_url: "https://upsc.gov.in/examinations/civil-services",
        source_name: "UPSC Official",
        category: "exams",
        subcategory: "UPSC",
        tags: ["UPSC", "Civil Services", "IAS", "IPS", "Government Exam"],
        region: "National",
        states: ["All India"],
        image_url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80",
        relevance_score: 95,
        key_takeaways: [
          "Applications open from today",
          "Prelims exam in May 2025",
          "Total 1000+ vacancies expected",
          "Apply before last date"
        ],
        impact_statement: "Major opportunity for aspirants nationwide to join prestigious civil services",
        is_featured: true
      },
      {
        headline: "SSC CGL 2025 Notification Released - 15000+ Vacancies",
        summary: "Staff Selection Commission announces Combined Graduate Level Examination with over 15,000 vacancies across various departments.",
        excerpt: "SSC CGL 2025 will be conducted in multiple tiers. Graduates can apply for positions in tax, audit, accounts, and other departments.",
        source_url: "https://ssc.gov.in/cgl2025",
        source_name: "SSC Official",
        category: "exams",
        subcategory: "SSC",
        tags: ["SSC", "CGL", "Government Jobs", "Graduate Level"],
        region: "National",
        states: ["All India"],
        image_url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
        relevance_score: 92,
        key_takeaways: [
          "15,000+ vacancies announced",
          "Open to all graduates",
          "Computer-based examination",
          "Multiple departments included"
        ],
        impact_statement: "Massive recruitment drive offers opportunities across central government departments",
        is_featured: false
      },
      {
        headline: "PM Kisan Samman Nidhi: 15th Installment Released",
        summary: "The government has released the 15th installment of PM-KISAN scheme, benefiting over 11 crore farmers with ₹2000 direct benefit transfer.",
        excerpt: "Farmers who have completed e-KYC and land verification will receive the payment directly in their bank accounts.",
        source_url: "https://pmkisan.gov.in",
        source_name: "PM-KISAN Portal",
        category: "schemes",
        subcategory: "Agriculture",
        tags: ["PM Kisan", "Farmer Scheme", "DBT", "Agriculture"],
        region: "National",
        states: ["All India"],
        image_url: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80",
        relevance_score: 88,
        key_takeaways: [
          "₹2000 payment released",
          "11+ crore farmers benefited",
          "e-KYC mandatory",
          "Direct bank transfer"
        ],
        impact_statement: "Direct financial support continues for farmers across India",
        is_featured: false
      },
      {
        headline: "Railway Recruitment Board: 50,000 Group D Vacancies Announced",
        summary: "RRB announces massive recruitment for Group D positions across all railway zones. Online applications to begin next week.",
        excerpt: "Indian Railways plans to fill 50,000 vacancies for various Group D positions including track maintainer, helper, and assistant posts.",
        source_url: "https://rrbcdg.gov.in",
        source_name: "RRB Official",
        category: "jobs",
        subcategory: "Railways",
        tags: ["Railway Jobs", "Group D", "RRB", "Government Recruitment"],
        region: "National",
        states: ["All India"],
        image_url: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&q=80",
        relevance_score: 90,
        key_takeaways: [
          "50,000 Group D vacancies",
          "All railway zones included",
          "10th pass eligible",
          "Online application process"
        ],
        impact_statement: "Largest railway recruitment drive provides opportunities for 10th pass candidates",
        is_featured: true
      },
      {
        headline: "Uttar Pradesh: New Skill Development Scheme Launched",
        summary: "UP Government launches Mukhyamantri Kaushal Vikas Yojana to train 5 lakh youth in various trades with placement guarantee.",
        excerpt: "The scheme offers free training in IT, manufacturing, healthcare, and retail sectors with 100% placement support.",
        source_url: "https://upskill.up.gov.in",
        source_name: "UP Government Portal",
        category: "schemes",
        subcategory: "Skill Development",
        tags: ["Skill Development", "UP", "Youth Employment", "Training"],
        region: "Uttar Pradesh",
        states: ["Uttar Pradesh"],
        relevance_score: 85,
        key_takeaways: [
          "5 lakh youth to be trained",
          "Free skill training",
          "Placement guarantee",
          "Multiple sectors covered"
        ],
        impact_statement: "Major skill development initiative for UP youth with job placement support",
        is_featured: false
      },
      {
        headline: "IBPS Clerk 2025: Online Application for 6000+ Posts",
        summary: "Institute of Banking Personnel Selection invites applications for Clerical cadre positions in public sector banks.",
        excerpt: "IBPS will conduct CWE for recruitment of clerks in 11 participating banks. Graduates can apply online.",
        source_url: "https://ibps.in/clerk2025",
        source_name: "IBPS Official",
        category: "exams",
        subcategory: "Banking",
        tags: ["IBPS", "Bank Clerk", "Banking Exam", "CWE"],
        region: "National",
        states: ["All India"],
        relevance_score: 87,
        key_takeaways: [
          "6000+ clerk positions",
          "11 public sector banks",
          "Graduate qualification required",
          "Preliminary and Mains exam"
        ],
        impact_statement: "Banking sector recruitment offers stable career opportunities for graduates",
        is_featured: false
      },
      {
        headline: "Ayushman Bharat: Coverage Extended to 5 Crore More Families",
        summary: "Government extends Ayushman Bharat-PMJAY coverage to include an additional 5 crore families under the health insurance scheme.",
        excerpt: "The expansion increases total coverage to 55 crore beneficiaries, providing health insurance up to ₹5 lakh per family annually.",
        source_url: "https://pmjay.gov.in",
        source_name: "Ayushman Bharat Portal",
        category: "schemes",
        subcategory: "Healthcare",
        tags: ["Ayushman Bharat", "Health Insurance", "PMJAY", "Healthcare"],
        region: "National",
        states: ["All India"],
        image_url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
        relevance_score: 91,
        key_takeaways: [
          "5 crore new families covered",
          "₹5 lakh annual coverage",
          "Free hospital treatment",
          "Cashless facility"
        ],
        impact_statement: "Massive expansion of health insurance scheme benefits millions of families",
        is_featured: true
      },
      {
        headline: "Maharashtra Police Recruitment: 10,000 Constable Vacancies",
        summary: "Maharashtra State Police announces recruitment for 10,000 constable posts across the state. Physical tests to begin in March.",
        excerpt: "Eligible candidates can apply for constable positions in various districts. The selection includes physical test, written exam, and medical examination.",
        source_url: "https://mahapolice.gov.in/recruitment",
        source_name: "Maharashtra Police",
        category: "jobs",
        subcategory: "Police",
        tags: ["Police Jobs", "Maharashtra", "Constable", "State Government"],
        region: "Maharashtra",
        states: ["Maharashtra"],
        relevance_score: 83,
        key_takeaways: [
          "10,000 constable vacancies",
          "Physical test in March",
          "12th pass eligible",
          "Both male and female candidates"
        ],
        impact_statement: "Large-scale police recruitment drive for Maharashtra youth",
        is_featured: false
      },
      {
        headline: "New Education Policy 2024: Key Changes Announced",
        summary: "Ministry of Education announces major amendments to NEP 2020, introducing flexible curriculum and skill-based learning pathways.",
        excerpt: "The revised policy emphasizes vocational training, multidisciplinary education, and includes provisions for credit transfer between institutions.",
        source_url: "https://education.gov.in/nep2024",
        source_name: "Ministry of Education",
        category: "policies",
        subcategory: "Education",
        tags: ["NEP", "Education Policy", "Higher Education", "Skill Based Learning"],
        region: "National",
        states: ["All India"],
        relevance_score: 86,
        key_takeaways: [
          "Flexible curriculum introduced",
          "Skill-based learning pathways",
          "Credit transfer system",
          "Multidisciplinary approach"
        ],
        impact_statement: "Education reforms aim to create more flexible and job-ready graduates",
        is_featured: false
      },
      {
        headline: "Karnataka: Startup Funding Scheme Launched for Women Entrepreneurs",
        summary: "Karnataka Government launches Shakti Startup Scheme providing up to ₹50 lakh funding for women-led startups in technology sector.",
        excerpt: "The scheme offers financial support, mentorship, and incubation facilities for women entrepreneurs in Bengaluru and tier-2 cities.",
        source_url: "https://karnatakastartup.gov.in/shakti",
        source_name: "Karnataka Startup Cell",
        category: "schemes",
        subcategory: "Entrepreneurship",
        tags: ["Startup Scheme", "Karnataka", "Women Entrepreneurs", "Funding"],
        region: "Karnataka",
        states: ["Karnataka"],
        relevance_score: 82,
        key_takeaways: [
          "Up to ₹50 lakh funding",
          "Women-led startups only",
          "Technology sector focus",
          "Mentorship included"
        ],
        impact_statement: "Progressive initiative to boost women entrepreneurship in Karnataka's tech ecosystem",
        is_featured: false
      }
    ];

    // Insert stories with current timestamps
    const storiesWithTimestamps = sampleStories.map(story => ({
      ...story,
      published_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last 7 days
      view_count: Math.floor(Math.random() * 1000),
      save_count: Math.floor(Math.random() * 100),
      share_count: Math.floor(Math.random() * 50),
      click_count: Math.floor(Math.random() * 500),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('discovery_stories')
      .upsert(storiesWithTimestamps, { onConflict: 'source_url' })
      .select();

    if (error) throw error;

    console.log(`Successfully seeded ${data.length} sample stories`);

    return new Response(
      JSON.stringify({ 
        success: true,
        count: data.length,
        message: `Successfully seeded ${data.length} sample stories`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Seeding failed:', error);
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
