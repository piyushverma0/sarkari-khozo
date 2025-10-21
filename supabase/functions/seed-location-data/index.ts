import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://india-location-hub.in/api';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting location data seeding...');

    // Step 1: Fetch and insert states
    console.log('Fetching states...');
    const statesResponse = await fetch(`${API_BASE_URL}/locations/states`);
    if (!statesResponse.ok) {
      throw new Error(`Failed to fetch states: ${statesResponse.statusText}`);
    }
    
    const statesData = await statesResponse.json();
    const states = statesData.data?.states || [];
    console.log(`Found ${states.length} states`);

    // Insert states
    const stateMap = new Map();
    for (const state of states) {
      const { data: existingState } = await supabaseClient
        .from('indian_states')
        .select('id')
        .eq('name', state.name)
        .maybeSingle();

      if (existingState) {
        stateMap.set(state.id, existingState.id);
        console.log(`State already exists: ${state.name}`);
      } else {
        const { data: newState, error } = await supabaseClient
          .from('indian_states')
          .insert({ name: state.name, code: state.code })
          .select('id')
          .single();

        if (error) {
          console.error(`Error inserting state ${state.name}:`, error);
          continue;
        }
        stateMap.set(state.id, newState.id);
        console.log(`Inserted state: ${state.name}`);
      }
    }

    // Step 2: Fetch and insert districts for each state
    let totalDistricts = 0;
    for (const state of states) {
      console.log(`Fetching districts for ${state.name}...`);
      const districtsResponse = await fetch(`${API_BASE_URL}/locations/districts?state_id=${state.id}`);
      
      if (!districtsResponse.ok) {
        console.error(`Failed to fetch districts for ${state.name}`);
        continue;
      }

      const districtsData = await districtsResponse.json();
      const districts = districtsData.data?.districts || [];
      console.log(`Found ${districts.length} districts for ${state.name}`);

      const districtMap = new Map();
      for (const district of districts) {
        const dbStateId = stateMap.get(state.id);
        if (!dbStateId) continue;

        const { data: existingDistrict } = await supabaseClient
          .from('indian_districts')
          .select('id')
          .eq('name', district.name)
          .eq('state_id', dbStateId)
          .maybeSingle();

        if (existingDistrict) {
          districtMap.set(district.id, existingDistrict.id);
        } else {
          const { data: newDistrict, error } = await supabaseClient
            .from('indian_districts')
            .insert({ name: district.name, state_id: dbStateId })
            .select('id')
            .single();

          if (error) {
            console.error(`Error inserting district ${district.name}:`, error);
            continue;
          }
          districtMap.set(district.id, newDistrict.id);
          totalDistricts++;
        }
      }

      // Step 3: Fetch and insert blocks for each district (limit to avoid timeout)
      // Only process first 5 districts per state to avoid function timeout
      const limitedDistricts = districts.slice(0, 5);
      for (const district of limitedDistricts) {
        console.log(`Fetching blocks for ${district.name}...`);
        const blocksResponse = await fetch(`${API_BASE_URL}/locations/blocks?district_id=${district.id}`);
        
        if (!blocksResponse.ok) {
          console.error(`Failed to fetch blocks for ${district.name}`);
          continue;
        }

        const blocksData = await blocksResponse.json();
        const blocks = blocksData.data?.blocks || [];

        for (const block of blocks) {
          const dbDistrictId = districtMap.get(district.id);
          if (!dbDistrictId) continue;

          const { data: existingBlock } = await supabaseClient
            .from('indian_blocks')
            .select('id')
            .eq('name', block.name)
            .eq('district_id', dbDistrictId)
            .maybeSingle();

          if (!existingBlock) {
            const { error } = await supabaseClient
              .from('indian_blocks')
              .insert({ name: block.name, district_id: dbDistrictId });

            if (error) {
              console.error(`Error inserting block ${block.name}:`, error);
            }
          }
        }
      }
    }

    console.log('Location data seeding completed');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Location data seeded successfully',
        stats: {
          states: states.length,
          districts: totalDistricts
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error seeding location data:', error);
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
