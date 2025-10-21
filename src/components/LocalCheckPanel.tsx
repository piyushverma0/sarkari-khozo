import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { getUserSavedLocation } from "@/lib/locationService";
import { LocalCheckDialog } from "./LocalCheckDialog";
import { LocalCheckResults, LocalInitiativeResult } from "./LocalCheckResults";

interface ApplicationData {
  id?: string;
  title: string;
  category?: string;
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

  const handleResults = (newResults: LocalInitiativeResult[]) => {
    setResults(newResults);
    setExpanded(false);
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
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => setExpanded(true)}
              size="lg"
              className="flex-1 min-h-[48px] h-16 text-lg"
              aria-label={currentLanguage === 'hi' ? 'मेरे क्षेत्र में जांचें' : 'Check for my area'}
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
              >
                <MapPin className="w-6 h-6 mr-2" aria-hidden="true" />
                {currentLanguage === 'hi' ? 'सहेजे गए स्थान का उपयोग करें' : 'Use saved location'}
              </Button>
            )}
          </div>
        ) : (
          <LocalCheckDialog
            application={application}
            userId={userId}
            savedLocation={savedLocation}
            onClose={() => setExpanded(false)}
            onResults={handleResults}
          />
        )}
        
        {results && (
          <LocalCheckResults 
            results={results} 
            state={savedLocation?.saved_state || ''} 
            district={savedLocation?.saved_district}
          />
        )}
      </CardContent>
    </Card>
  );
};
