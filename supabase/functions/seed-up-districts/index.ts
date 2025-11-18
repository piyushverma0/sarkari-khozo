import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Complete list of 75 Uttar Pradesh districts
const UP_DISTRICTS = [
  'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya',
  'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki',
  'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli',
  'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad',
  'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur',
  'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj',
  'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar',
  'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau',
  'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh',
  'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar',
  'Shahjahanpur', 'Shamli', 'Shrawasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra',
  'Sultanpur', 'Unnao', 'Varanasi'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Seeding Uttar Pradesh districts...');

    // Get Uttar Pradesh state ID
    const { data: upState, error: stateError } = await supabaseClient
      .from('indian_states')
      .select('id')
      .eq('name', 'UTTAR PRADESH')
      .maybeSingle();

    if (stateError || !upState) {
      throw new Error('Uttar Pradesh state not found');
    }

    console.log(`Found Uttar Pradesh state with ID: ${upState.id}`);

    // Insert districts
    let inserted = 0;
    let existing = 0;

    for (const districtName of UP_DISTRICTS) {
      const { data: existingDistrict } = await supabaseClient
        .from('indian_districts')
        .select('id')
        .eq('name', districtName.toUpperCase())
        .eq('state_id', upState.id)
        .maybeSingle();

      if (existingDistrict) {
        existing++;
        console.log(`District already exists: ${districtName}`);
      } else {
        const { error: insertError } = await supabaseClient
          .from('indian_districts')
          .insert({ 
            name: districtName.toUpperCase(), 
            state_id: upState.id 
          });

        if (insertError) {
          console.error(`Error inserting district ${districtName}:`, insertError);
        } else {
          inserted++;
          console.log(`Inserted district: ${districtName}`);
        }
      }
    }

    console.log(`Seeding completed. Inserted: ${inserted}, Already existed: ${existing}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Uttar Pradesh districts seeded successfully',
        stats: {
          inserted,
          existing,
          total: UP_DISTRICTS.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error seeding UP districts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
