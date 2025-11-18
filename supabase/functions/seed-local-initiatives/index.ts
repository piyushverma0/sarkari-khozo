import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// National schemes with state-level rollout data
const NATIONAL_SCHEMES = [
  {
    program_title: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    category: 'agriculture',
    state: 'All States',
    description: '₹6000/year direct income support to farmers',
    mode: 'online',
    apply_url: 'https://pmkisan.gov.in/',
    source_url: 'https://pmkisan.gov.in/',
    source: 'PM-KISAN Official Portal',
    confidence_level: 'verified',
    last_verified_at: new Date().toISOString(),
  },
  {
    program_title: 'Ayushman Bharat - PM-JAY',
    category: 'healthcare',
    state: 'All States',
    description: '₹5 lakh health insurance cover per family per year',
    mode: 'csc',
    apply_url: 'https://pmjay.gov.in/howtoenroll',
    source_url: 'https://pmjay.gov.in/',
    source: 'Ayushman Bharat Official Portal',
    confidence_level: 'verified',
    last_verified_at: new Date().toISOString(),
  },
  {
    program_title: 'Pradhan Mantri Ujjwala Yojana',
    category: 'welfare',
    state: 'All States',
    description: 'Free LPG connection to women from BPL households',
    mode: 'office',
    apply_url: 'https://www.pmuy.gov.in/',
    source_url: 'https://www.pmuy.gov.in/',
    source: 'PMUY Official Portal',
    confidence_level: 'verified',
    last_verified_at: new Date().toISOString(),
  },
  {
    program_title: 'Pradhan Mantri Awas Yojana - Gramin',
    category: 'housing',
    state: 'All States',
    description: 'Housing support for rural poor',
    mode: 'office',
    apply_url: 'https://pmayg.nic.in/',
    source_url: 'https://pmayg.nic.in/',
    source: 'PMAY-G Official Portal',
    confidence_level: 'verified',
    last_verified_at: new Date().toISOString(),
  },
  {
    program_title: 'MGNREGA (Mahatma Gandhi National Rural Employment Guarantee Act)',
    category: 'employment',
    state: 'All States',
    description: '100 days guaranteed wage employment in rural areas',
    mode: 'office',
    apply_url: 'https://nrega.nic.in/',
    source_url: 'https://nrega.nic.in/',
    source: 'MGNREGA Official Portal',
    confidence_level: 'verified',
    last_verified_at: new Date().toISOString(),
  },
  {
    program_title: 'Pradhan Mantri Jan Dhan Yojana',
    category: 'banking',
    state: 'All States',
    description: 'Financial inclusion - bank account with RuPay debit card',
    mode: 'office',
    apply_url: 'https://www.pmjdy.gov.in/',
    source_url: 'https://www.pmjdy.gov.in/',
    source: 'PMJDY Official Portal',
    confidence_level: 'verified',
    last_verified_at: new Date().toISOString(),
  },
];

// State-specific schemes (top schemes per state)
const STATE_SCHEMES: Record<string, any[]> = {
  'Karnataka': [
    {
      program_title: 'Karnataka Startup Policy 2022-2027',
      category: 'startup',
      state: 'Karnataka',
      district: 'Bangalore Urban',
      description: 'Comprehensive support for startups including funding, mentorship, and infrastructure',
      mode: 'online',
      apply_url: 'https://kum.karnataka.gov.in/',
      source_url: 'https://kum.karnataka.gov.in/',
      source: 'Karnataka Udyog Mitra',
      confidence_level: 'verified',
      last_verified_at: new Date().toISOString(),
    },
    {
      program_title: 'Gruha Lakshmi Scheme',
      category: 'welfare',
      state: 'Karnataka',
      description: '₹2000/month direct benefit transfer to women heads of households',
      mode: 'online',
      apply_url: 'https://sevasindhu.karnataka.gov.in/',
      source_url: 'https://sevasindhu.karnataka.gov.in/',
      source: 'Seva Sindhu Portal',
      confidence_level: 'verified',
      last_verified_at: new Date().toISOString(),
    },
  ],
  'Maharashtra': [
    {
      program_title: 'Maharashtra State Innovation Society Startup Scheme',
      category: 'startup',
      state: 'Maharashtra',
      description: 'Funding and support for startups in Maharashtra',
      mode: 'online',
      apply_url: 'https://startup.maharashtra.gov.in/',
      source_url: 'https://startup.maharashtra.gov.in/',
      source: 'Maharashtra Startup',
      confidence_level: 'verified',
      last_verified_at: new Date().toISOString(),
    },
  ],
  'Tamil Nadu': [
    {
      program_title: 'Tamil Nadu Startup and Innovation Policy',
      category: 'startup',
      state: 'Tamil Nadu',
      description: 'Comprehensive startup support including seed funding and mentorship',
      mode: 'online',
      apply_url: 'https://startuptn.in/',
      source_url: 'https://startuptn.in/',
      source: 'StartupTN',
      confidence_level: 'verified',
      last_verified_at: new Date().toISOString(),
    },
  ],
  'Delhi': [
    {
      program_title: 'Delhi Startup Policy',
      category: 'startup',
      state: 'Delhi',
      description: 'Support for startups including funding and incubation',
      mode: 'online',
      apply_url: 'https://delhiplanning.delhi.gov.in/',
      source_url: 'https://delhiplanning.delhi.gov.in/',
      source: 'Delhi Government',
      confidence_level: 'verified',
      last_verified_at: new Date().toISOString(),
    },
  ],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('Starting database seeding...');

    // Collect all initiatives to insert
    const allInitiatives: any[] = [];

    // Add national schemes for all major states
    const MAJOR_STATES = [
      'Bihar', 'Karnataka', 'Maharashtra', 'Delhi', 'Tamil Nadu', 
      'Uttar Pradesh', 'Gujarat', 'West Bengal', 'Rajasthan', 'Andhra Pradesh'
    ];

    for (const state of MAJOR_STATES) {
      for (const scheme of NATIONAL_SCHEMES) {
        allInitiatives.push({
          ...scheme,
          state,
          id: crypto.randomUUID(),
        });
      }
    }

    // Add state-specific schemes
    for (const [state, schemes] of Object.entries(STATE_SCHEMES)) {
      for (const scheme of schemes) {
        allInitiatives.push({
          ...scheme,
          id: crypto.randomUUID(),
        });
      }
    }

    console.log(`Inserting ${allInitiatives.length} initiatives...`);

    // Insert in batches to avoid timeout
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    for (let i = 0; i < allInitiatives.length; i += BATCH_SIZE) {
      const batch = allInitiatives.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('local_initiatives')
        .upsert(batch, { 
          onConflict: 'program_title,state',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Batch insert error:', error);
        throw error;
      }

      insertedCount += batch.length;
      console.log(`Inserted ${insertedCount}/${allInitiatives.length} initiatives`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully seeded ${insertedCount} local initiatives`,
        details: {
          nationalSchemes: NATIONAL_SCHEMES.length,
          stateSchemes: Object.values(STATE_SCHEMES).flat().length,
          totalInserted: insertedCount,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Seeding error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
