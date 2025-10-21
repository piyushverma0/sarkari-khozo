import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MapPin, Edit, Loader2, ChevronLeft } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "@/hooks/use-toast";
import { INDIAN_STATES, getDistrictsByState, reverseGeocode, saveUserLocation } from "@/lib/locationService";
import { supabase } from "@/integrations/supabase/client";
import { LocalInitiativeResult } from "./LocalCheckResults";

interface ApplicationData {
  id: string;
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
  const [saveLocation, setSaveLocation] = useState(false);
  const [districts, setDistricts] = useState<string[]>([]);
  const [districtSearch, setDistrictSearch] = useState('');

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
    setAnswers(prev => ({ ...prev, state }));
    const stateDistricts = await getDistrictsByState(state);
    setDistricts(stateDistricts);
    setCurrentStep('district');
  };

  const handleDistrictSelect = (district: string) => {
    setAnswers(prev => ({ ...prev, district }));
    setCurrentStep('block');
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
                className="w-full h-16 text-base justify-start"
              >
                <MapPin className="w-5 h-5 mr-3" />
                Use saved location ({savedLocation.saved_state})
              </Button>
            )}
            
            <Button
              onClick={() => handleMethodChoice('browser')}
              variant="outline"
              size="lg"
              className="w-full h-16 text-base justify-start"
            >
              <MapPin className="w-5 h-5 mr-3" />
              Use current location
            </Button>
            
            <Button
              onClick={() => handleMethodChoice('manual')}
              variant="outline"
              size="lg"
              className="w-full h-16 text-base justify-start"
            >
              <Edit className="w-5 h-5 mr-3" />
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
            
            <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
              {INDIAN_STATES.map(state => (
                <Button
                  key={state}
                  onClick={() => handleStateSelect(state)}
                  variant="outline"
                  size="lg"
                  className="h-14 text-sm"
                >
                  {state}
                </Button>
              ))}
            </div>
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
            
            <Input
              placeholder="Search districts..."
              value={districtSearch}
              onChange={(e) => setDistrictSearch(e.target.value)}
              className="mb-2"
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
              <Button
                onClick={() => setCurrentStep('block')}
                variant="ghost"
                className="col-span-2"
              >
                Skip
              </Button>
            </div>
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
            
            <Input
              placeholder="Enter block or village name"
              value={answers.block || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, block: e.target.value }))}
              className="h-12 text-base"
            />
            
            <Button
              onClick={handleBlockSubmit}
              size="lg"
              className="w-full h-14"
            >
              Continue
            </Button>
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
    </div>
  );
};
