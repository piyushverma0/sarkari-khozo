import { supabase } from "@/integrations/supabase/client";

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
  'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep'
];

// Simplified district data - in production, this would be a comprehensive JSON file
const DISTRICTS_BY_STATE: Record<string, string[]> = {
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Araria', 'Kishanganj', 'Nalanda', 'Vaishali'],
  'Karnataka': ['Bangalore Urban', 'Bangalore Rural', 'Mysore', 'Tumkur', 'Belgaum', 'Gulbarga', 'Mangalore', 'Hubli-Dharwad', 'Bellary', 'Bijapur'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Kolhapur', 'Sangli'],
  'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Erode', 'Vellore', 'Thanjavur'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Meerut', 'Varanasi', 'Allahabad', 'Bareilly', 'Aligarh', 'Moradabad'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Navsari'],
  'West Bengal': ['Kolkata', 'Howrah', 'Darjeeling', 'Jalpaiguri', 'Bardhaman', 'Nadia', 'Murshidabad', 'North 24 Parganas', 'South 24 Parganas', 'Hooghly'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Rajahmundry', 'Kakinada', 'Kadapa', 'Anantapur'],
};

export const getDistrictsByState = async (state: string): Promise<string[]> => {
  // Return districts from the map, or empty array if state not found
  return DISTRICTS_BY_STATE[state] || [];
};

export const reverseGeocode = async (lat: number, lng: number): Promise<{
  state: string;
  district: string;
}> => {
  try {
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
    
    return {
      state: data.address?.state || '',
      district: data.address?.county || data.address?.state_district || ''
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw new Error('Unable to determine location from coordinates');
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
