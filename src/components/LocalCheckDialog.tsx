import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MapPin, Edit, Loader2, ChevronLeft } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "@/hooks/use-toast";
import { getAllStates, getDistrictsByState, getBlocksByDistrict, reverseGeocode, saveUserLocation } from "@/lib/locationService";
import { supabase } from "@/integrations/supabase/client";
import { LocalInitiativeResult } from "./LocalCheckResults";
import { debounce } from "@/lib/debounce";

interface ApplicationData {
  id?: string;
  title: string;
  category?: string;
}

interface LocationData {
  saved_state?: string;
  saved_district?: string;
  saved_block?: string;
}

interface LocalCheckDialogProps {
  application: ApplicationData;
  userId?: string;
  savedLocation?: LocationData | null;
  onClose: () => void;
  onResults: (results: LocalInitiativeResult[]) => void;
}

type Step = 'method' | 'state' | 'district' | 'block' | 'confirm';

export const LocalCheckDialog = ({ 
  application, 
  userId, 
  savedLocation,
  onClose,
  onResults 
}: LocalCheckDialogProps) => {
  const { currentLanguage } = useTranslation();
  const [currentStep, setCurrentStep] = useState<Step>('method');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [saveLocation, setSaveLocation] = useState(false);
  const [states, setStates] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [districtSearch, setDistrictSearch] = useState('');

  // Load states on mount
  useEffect(() => {
    const loadStates = async () => {
      const statesList = await getAllStates();
      setStates(statesList);
    };
    loadStates();
  }, []);

  // Debounced district search
  const debouncedSetSearch = useMemo(
    () => debounce((value: string) => setDistrictSearch(value), 500),
    []
  );

  const handleMethodChoice = async (method: 'saved' | 'browser' | 'manual') => {
    if (method === 'saved' && savedLocation?.saved_state) {
      setAnswers({
        state: savedLocation.saved_state,
        district: savedLocation.saved_district || '',
        block: savedLocation.saved_block || ''
      });
      setCurrentStep('confirm');
    } else if (method === 'browser') {
      await handleBrowserLocation();
    } else {
      setCurrentStep('state');
    }
  };

  const handleBrowserLocation = async () => {
    if (!('geolocation' in navigator)) {
      toast({
        title: 'Location not supported',
        description: 'Your browser does not support location services',
        variant: 'destructive'
      });
      setCurrentStep('state');
      return;
    }

    setIsProcessing(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true
        });
      });
      
      const location = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      
      if (location.state) {
        setAnswers({ 
          state: location.state, 
          district: location.district || '' 
        });
        setCurrentStep('confirm');
      } else {
        throw new Error('Could not determine location');
      }
    } catch (error) {
      console.error('Geolocation error:', error);
      toast({
        title: 'Location Permission Denied',
        description: 'Please enable location or type your district manually.',
        variant: 'destructive'
      });
      setCurrentStep('state');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStateSelect = async (state: string) => {
    setAnswers(prev => ({ ...prev, state, district: undefined, block: undefined }));
    setIsProcessing(true);
    try {
      const stateDistricts = await getDistrictsByState(state);
      setDistricts(stateDistricts);
      setCurrentStep('district');
    } catch (error) {
      console.error('Error loading districts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load districts',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDistrictSelect = async (district: string) => {
    setAnswers(prev => ({ ...prev, district, block: undefined }));
    setIsProcessing(true);
    try {
      if (answers.state) {
        const blocksList = await getBlocksByDistrict(answers.state, district);
        setBlocks(blocksList);
      }
      setCurrentStep('block');
    } catch (error) {
      console.error('Error loading blocks:', error);
      setCurrentStep('block');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBlockSubmit = () => {
    setCurrentStep('confirm');
  };

  const handleSubmit = async () => {
    if (!answers.state) {
      toast({
        title: 'Missing information',
        description: 'Please provide at least your state',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Save location if requested
      if (saveLocation && userId) {
        await saveUserLocation(
          userId,
          answers.state,
          answers.district,
          answers.block
        );
      }

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('check-local-availability', {
        body: {
          programTitle: application.title,
          category: application.category,
          state: answers.state,
          district: answers.district,
          block: answers.block,
          userId
        }
      });

      if (error) throw error;

      onResults(data.results || []);
      
      toast({
        title: data.helperText || 'Search completed',
        description: `Found ${data.results?.length || 0} program(s)`
      });
    } catch (error) {
      console.error('Local check error:', error);
      toast({
        title: 'Search failed',
        description: 'Unable to check local availability. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredDistricts = districts.filter(d => 
    d.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const renderStep = () => {
    switch (currentStep) {
      case 'method':
        return (
          <div className="space-y-3">
            <h3 className="font-medium text-lg mb-4">
              {currentLanguage === 'hi' ? 'अपना क्षेत्र कैसे खोजें?' : 'How should we find your area?'}
            </h3>
            
            {savedLocation?.saved_state && (
              <Button
                onClick={() => handleMethodChoice('saved')}
                variant="outline"
                size="lg"
                className="w-full min-h-[48px] h-16 text-base justify-start"
                aria-label={`Use saved location: ${savedLocation.saved_state}`}
              >
                <MapPin className="w-5 h-5 mr-3" aria-hidden="true" />
                Use saved location ({savedLocation.saved_state})
              </Button>
            )}
            
            <Button
              onClick={() => handleMethodChoice('browser')}
              variant="outline"
              size="lg"
              className="w-full min-h-[48px] h-16 text-base justify-start"
              aria-label="Use my current browser location"
            >
              <MapPin className="w-5 h-5 mr-3" aria-hidden="true" />
              Use current location
            </Button>
            
            <Button
              onClick={() => handleMethodChoice('manual')}
              variant="outline"
              size="lg"
              className="w-full min-h-[48px] h-16 text-base justify-start"
              aria-label="Manually enter my district or village"
            >
              <Edit className="w-5 h-5 mr-3" aria-hidden="true" />
              Type my district/village
            </Button>
          </div>
        );

      case 'state':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep('method')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-medium text-lg">
                {currentLanguage === 'hi' ? 'कौन सा राज्य?' : 'Which state?'}
              </h3>
            </div>
            
            {states.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading states...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                {states.map(state => (
                  <Button
                    key={state.id}
                    onClick={() => handleStateSelect(state.name)}
                    variant="outline"
                    size="lg"
                    className="h-14 text-sm"
                    disabled={isProcessing}
                  >
                    {state.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );

      case 'district':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep('state')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-medium text-lg">
                {currentLanguage === 'hi' ? 'कौन सा जिला?' : 'Which district?'}
              </h3>
            </div>
            
            {districts.length > 0 ? (
              <>
                <Input
                  placeholder="Search districts..."
                  value={districtSearch}
                  onChange={(e) => debouncedSetSearch(e.target.value)}
                  className="mb-2"
                  aria-label="Search for your district"
                />
                
                <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                  {filteredDistricts.length > 0 ? (
                    filteredDistricts.map(district => (
                      <Button
                        key={district}
                        onClick={() => handleDistrictSelect(district)}
                        variant="outline"
                        size="lg"
                        className="h-14 text-sm"
                      >
                        {district}
                      </Button>
                    ))
                  ) : (
                    <p className="col-span-2 text-center text-muted-foreground py-4">
                      No districts found
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {currentLanguage === 'hi' 
                    ? 'अपना जिला या गांव का नाम लिखें' 
                    : 'Enter your district or village name'}
                </p>
                <Input
                  placeholder={currentLanguage === 'hi' ? 'जिला या गांव का नाम' : 'District or village name'}
                  value={answers.district || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, district: e.target.value }))}
                  className="h-12 text-base"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && answers.district) {
                      setCurrentStep('block');
                    }
                  }}
                />
                <Button
                  onClick={() => answers.district && setCurrentStep('block')}
                  disabled={!answers.district}
                  className="w-full"
                >
                  {currentLanguage === 'hi' ? 'जारी रखें' : 'Continue'}
                </Button>
              </div>
            )}
            
            {districts.length > 0 && (
              <Button
                onClick={() => setCurrentStep('block')}
                variant="ghost"
                className="w-full mt-2"
              >
                Skip
              </Button>
            )}
          </div>
        );

      case 'block':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep('district')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-medium text-lg">
                {currentLanguage === 'hi' ? 'ब्लॉक या गांव? (वैकल्पिक)' : 'Which block or village? (Optional)'}
              </h3>
            </div>
            
            {blocks.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto mb-4">
                {blocks.map(block => (
                  <Button
                    key={block}
                    onClick={() => {
                      setAnswers(prev => ({ ...prev, block }));
                      handleBlockSubmit();
                    }}
                    variant="outline"
                    size="lg"
                    className="h-14 text-sm"
                  >
                    {block}
                  </Button>
                ))}
              </div>
            ) : (
              <Input
                placeholder="Enter block or village name"
                value={answers.block || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, block: e.target.value }))}
                className="h-12 text-base mb-4"
              />
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setAnswers(prev => ({ ...prev, block: '' }));
                  handleBlockSubmit();
                }}
                variant="outline"
                size="lg"
                className="flex-1 h-14"
              >
                Skip
              </Button>
              <Button
                onClick={handleBlockSubmit}
                size="lg"
                className="flex-1 h-14"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-lg mb-4">Confirm your location</h3>
            
            <Card>
              <CardContent className="pt-6">
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">State</dt>
                    <dd className="font-medium">{answers.state}</dd>
                  </div>
                  {answers.district && (
                    <div>
                      <dt className="text-sm text-muted-foreground">District</dt>
                      <dd className="font-medium">{answers.district}</dd>
                    </div>
                  )}
                  {answers.block && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Block/Village</dt>
                      <dd className="font-medium">{answers.block}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {userId && (
              <div className="flex items-center gap-2 p-4 border rounded-lg">
                <Switch
                  id="save-location"
                  checked={saveLocation}
                  onCheckedChange={setSaveLocation}
                />
                <Label htmlFor="save-location" className="text-sm cursor-pointer">
                  Save this location for future checks
                </Label>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentStep('method')}
                variant="outline"
                size="lg"
                className="flex-1 h-14"
              >
                Change
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isProcessing}
                size="lg"
                className="flex-1 h-14"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Availability'
                )}
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="py-4">
      {renderStep()}
      
      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-8 gap-3 mt-4" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          {processingStatus && (
            <p className="text-sm text-muted-foreground">{processingStatus}</p>
          )}
          <span className="sr-only">Loading local programs...</span>
        </div>
      )}
    </div>
  );
};
