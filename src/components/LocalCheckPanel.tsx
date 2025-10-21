import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { getUserSavedLocation } from "@/lib/locationService";
import { LocalCheckDialog } from "./LocalCheckDialog";
import { LocalCheckResults, LocalInitiativeResult } from "./LocalCheckResults";
import { supabase } from "@/integrations/supabase/client";

interface ApplicationData {
  id?: string;
  title: string;
  category?: string;
  local_availability_cache?: {
    results: LocalInitiativeResult[];
    state: string;
    district?: string;
    cachedAt: string;
  };
}

interface LocalCheckPanelProps {
  application: ApplicationData;
  userId?: string;
}

export const LocalCheckPanel = ({ application, userId }: LocalCheckPanelProps) => {
  const { currentLanguage } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [savedLocation, setSavedLocation] = useState<any>(null);
  const [hasSavedLocation, setHasSavedLocation] = useState(false);
  const [results, setResults] = useState<LocalInitiativeResult[] | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  const [cacheInfo, setCacheInfo] = useState<{ state: string; district?: string } | null>(null);

  // Load cached results if available
  useEffect(() => {
    const loadCachedResults = async () => {
      if (!application.id) {
        setIsLoadingCache(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('applications')
          .select('local_availability_cache')
          .eq('id', application.id)
          .single();

        if (!error && data?.local_availability_cache) {
          const cache = data.local_availability_cache as any;
          if (cache.results && cache.state) {
            setResults(cache.results);
            setCacheInfo({ state: cache.state, district: cache.district });
            console.log('Loaded cached local availability results');
          }
        }
      } catch (error) {
        console.error('Failed to load cached results:', error);
      } finally {
        setIsLoadingCache(false);
      }
    };

    loadCachedResults();
  }, [application.id]);

  useEffect(() => {
    const loadSavedLocation = async () => {
      if (userId) {
        try {
          const location = await getUserSavedLocation(userId);
          if (location && location.saved_state) {
            setSavedLocation(location);
            setHasSavedLocation(true);
          }
        } catch (error) {
          console.error('Failed to load saved location:', error);
        }
      }
    };

    loadSavedLocation();
  }, [userId]);

  const handleUseSavedLocation = () => {
    setExpanded(true);
  };

  const handleResults = async (newResults: LocalInitiativeResult[], state: string, district?: string) => {
    setResults(newResults);
    setCacheInfo({ state, district });
    setExpanded(false);

    // Save to cache if application has an ID
    if (application.id && userId) {
      try {
        await supabase
          .from('applications')
          .update({
            local_availability_cache: {
              results: newResults as any,
              state,
              district,
              cachedAt: new Date().toISOString(),
            } as any
          })
          .eq('id', application.id);
        
        console.log('Cached local availability results');
      } catch (error) {
        console.error('Failed to cache results:', error);
      }
    }
  };

  const handleRefreshCache = () => {
    setResults(null);
    setCacheInfo(null);
    setExpanded(true);
  };

  return (
    <Card className="mt-6 border-2 border-primary/30 bg-gradient-to-br from-blue-900/10 to-purple-900/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">
            {currentLanguage === 'hi' 
              ? 'स्थानीय जांच — क्या यह आपके पास सक्रिय है?' 
              : 'Local Check — Is this active near you?'}
          </CardTitle>
        </div>
        <CardDescription>
          {currentLanguage === 'hi'
            ? 'जांचें कि यह योजना/कार्यक्रम आपके जिले या ब्लॉक में चल रहा है या नहीं।'
            : 'Check if this scheme/program is running in your district or block.'}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!expanded ? (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => setExpanded(true)}
                size="lg"
                className="flex-1 min-h-[48px] h-16 text-lg"
                aria-label={currentLanguage === 'hi' ? 'मेरे क्षेत्र में जांचें' : 'Check for my area'}
                disabled={isLoadingCache}
              >
                <MapPin className="w-6 h-6 mr-2" aria-hidden="true" />
                {currentLanguage === 'hi' ? 'मेरे क्षेत्र में जांचें' : 'Check for my area'}
              </Button>
              
              {hasSavedLocation && (
                <Button
                  onClick={handleUseSavedLocation}
                  variant="outline"
                  size="lg"
                  className="flex-1 min-h-[48px] h-16 text-lg"
                  aria-label={currentLanguage === 'hi' ? 'सहेजे गए स्थान का उपयोग करें' : 'Use saved location'}
                  disabled={isLoadingCache}
                >
                  <MapPin className="w-6 h-6 mr-2" aria-hidden="true" />
                  {currentLanguage === 'hi' ? 'सहेजे गए स्थान का उपयोग करें' : 'Use saved location'}
                </Button>
              )}
            </div>
            
            {results && (
              <div className="mt-3">
                <Button
                  onClick={handleRefreshCache}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {currentLanguage === 'hi' ? 'परिणाम ताज़ा करें' : 'Refresh Results'}
                </Button>
              </div>
            )}
          </>
        ) : (
          <LocalCheckDialog
            application={application}
            userId={userId}
            savedLocation={savedLocation}
            onClose={() => setExpanded(false)}
            onResults={handleResults}
          />
        )}
        
        {results && cacheInfo && (
          <LocalCheckResults 
            results={results} 
            state={cacheInfo.state} 
            district={cacheInfo.district}
          />
        )}
      </CardContent>
    </Card>
  );
};
