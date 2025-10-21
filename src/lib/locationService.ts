import { supabase } from "@/integrations/supabase/client";

// India Location Hub API Base URL
const API_BASE_URL = 'https://india-location-hub.in/api';

// Cache configuration
const CACHE_EXPIRY_HOURS = 24;
const CACHE_KEYS = {
  STATES: 'location_states_cache',
  DISTRICTS: 'location_districts_cache',
  BLOCKS: 'location_blocks_cache',
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

    const response = await fetch(`${API_BASE_URL}/locations/states`);
    if (!response.ok) throw new Error('Failed to fetch states');
    
    const result: LocationApiResponse<{ states: State[] }> = await response.json();
    const states = result.data?.states || [];
    
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

    const response = await fetch(`${API_BASE_URL}/locations/districts?state_id=${state.id}`);
    if (!response.ok) throw new Error('Failed to fetch districts');
    
    const result: LocationApiResponse<{ districts: District[] }> = await response.json();
    const districts = (result.data?.districts || []).map((d: District) => d.name);
    
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

    // Get district ID
    const response = await fetch(`${API_BASE_URL}/locations/districts?state_id=${state.id}`);
    if (!response.ok) return [];
    
    const districtResult: LocationApiResponse<{ districts: District[] }> = await response.json();
    const district = (districtResult.data?.districts || []).find((d: District) => d.name === districtName);
    if (!district) return [];

    // Get blocks
    const blocksResponse = await fetch(`${API_BASE_URL}/locations/blocks?district_id=${district.id}`);
    if (!blocksResponse.ok) return [];
    
    const blocksResult: LocationApiResponse<{ blocks: Block[] }> = await blocksResponse.json();
    const blocks = (blocksResult.data?.blocks || []).map((b: Block) => b.name);
    
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
