import { supabase } from "@/integrations/supabase/client";

// Cache configuration
const CACHE_EXPIRY_HOURS = 24;
const CACHE_VERSION = 'v2'; // Increment to invalidate all caches
const CACHE_KEYS = {
  STATES: `location_states_cache_${CACHE_VERSION}`,
  DISTRICTS: `location_districts_cache_${CACHE_VERSION}`,
  BLOCKS: `location_blocks_cache_${CACHE_VERSION}`,
};

// Type definitions
interface State {
  id: string;
  name: string;
  code: string;
}

interface District {
  id: string;
  name: string;
  state_id: string;
}

interface Block {
  id: string;
  name: string;
  district_id: string;
}

interface LocationApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Generic cache helper
const getCachedData = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      if (age < CACHE_EXPIRY_HOURS * 60 * 60 * 1000) {
        return data;
      }
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  return null;
};

const setCachedData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Cache write error:', error);
  }
};

// Fetch all Indian states
export const getAllStates = async (): Promise<State[]> => {
  try {
    const cached = getCachedData<State[]>(CACHE_KEYS.STATES);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('indian_states')
      .select('id, name, code')
      .order('name');

    if (error) throw error;
    
    const states = data || [];
    setCachedData(CACHE_KEYS.STATES, states);
    return states;
  } catch (error) {
    console.error('Error fetching states:', error);
    return [];
  }
};

// Fetch districts for a state
export const getDistrictsByState = async (stateName: string): Promise<string[]> => {
  try {
    const cacheKey = `${CACHE_KEYS.DISTRICTS}_${stateName}`;
    const cached = getCachedData<string[]>(cacheKey);
    if (cached) return cached;

    // First get all states to find the state ID
    const states = await getAllStates();
    const state = states.find(s => s.name === stateName);
    
    if (!state) {
      console.error('State not found:', stateName);
      return [];
    }

    const { data, error } = await supabase
      .from('indian_districts')
      .select('name')
      .eq('state_id', state.id)
      .order('name');

    if (error) throw error;
    
    const districts = (data || []).map(d => d.name);
    setCachedData(cacheKey, districts);
    return districts;
  } catch (error) {
    console.error('Error fetching districts:', error);
    return [];
  }
};

// Fetch blocks/talukas for a district
export const getBlocksByDistrict = async (stateName: string, districtName: string): Promise<string[]> => {
  try {
    const cacheKey = `${CACHE_KEYS.BLOCKS}_${stateName}_${districtName}`;
    const cached = getCachedData<string[]>(cacheKey);
    if (cached) return cached;

    // Get state ID
    const states = await getAllStates();
    const state = states.find(s => s.name === stateName);
    if (!state) return [];

    // Get district ID from our database
    const { data: districtData, error: districtError } = await supabase
      .from('indian_districts')
      .select('id')
      .eq('state_id', state.id)
      .eq('name', districtName)
      .maybeSingle();

    if (districtError || !districtData) return [];

    // Get blocks
    const { data: blocksData, error: blocksError } = await supabase
      .from('indian_blocks')
      .select('name')
      .eq('district_id', districtData.id)
      .order('name');

    if (blocksError) return [];
    
    const blocks = (blocksData || []).map(b => b.name);
    setCachedData(cacheKey, blocks);
    return blocks;
  } catch (error) {
    console.error('Error fetching blocks:', error);
    return [];
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<{
  state: string;
  district: string;
}> => {
  try {
    // Check if coordinates are within India bounds (approximately)
    const isInIndia = lat >= 6 && lat <= 37 && lng >= 68 && lng <= 98;
    if (!isInIndia) {
      throw new Error('Location is outside India. Please select your location manually.');
    }

    // Use Nominatim for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'FormVerseApp/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    
    const data = await response.json();
    const rawState = data.address?.state || '';
    const rawDistrict = data.address?.county || data.address?.state_district || '';

    // Validate state against our Indian states list
    const states = await getAllStates();
    const matchedState = states.find(s => 
      s.name.toLowerCase() === rawState.toLowerCase() ||
      rawState.toLowerCase().includes(s.name.toLowerCase()) ||
      s.name.toLowerCase().includes(rawState.toLowerCase())
    );

    if (!matchedState) {
      throw new Error('Could not match location to an Indian state. Please select manually.');
    }
    
    return {
      state: matchedState.name,
      district: rawDistrict
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
};

export const saveUserLocation = async (
  userId: string,
  state: string,
  district?: string,
  block?: string
) => {
  const { error } = await supabase
    .from('profiles')
    .update({
      saved_state: state,
      saved_district: district,
      saved_block: block,
      location_updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
  
  if (error) throw error;
};

export const getUserSavedLocation = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('saved_state, saved_district, saved_block')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};
