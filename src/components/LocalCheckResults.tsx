import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, MapPin, FileText, ExternalLink, Share2, Info, AlertCircle, Bell, Mail } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export interface LocalInitiativeResult {
  title: string;
  scope: 'district' | 'state' | 'national';
  mode: 'online' | 'csc' | 'office';
  deadline?: string;
  applyUrl?: string;
  contactInfo?: { phone?: string; email?: string };
  confidence: 'verified' | 'likely' | 'community';
  source: string;
  lastVerified?: string;
  description?: string;
  howToApply?: string;
  sourceUrl?: string;
}

interface LocalCheckResultsProps {
  results: LocalInitiativeResult[];
  state: string;
  district?: string;
}

export const LocalCheckResults = ({ results, state, district }: LocalCheckResultsProps) => {
  const { currentLanguage } = useTranslation();
  const navigate = useNavigate();

  const handleFindHelpCenter = (result: LocalInitiativeResult) => {
    navigate('/category/csc-locator');
  };

  const handleShare = async (result: LocalInitiativeResult) => {
    const shareText = `Check out this program: ${result.title}\n${result.description || ''}\n${result.applyUrl || ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: result.title,
          text: shareText,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to clipboard",
        description: "Program details copied to clipboard",
      });
    }
  };

  const handleMonitorRequest = () => {
    toast({
      title: "Monitoring set up",
      description: "We'll notify you when programs become available in your area",
    });
  };

  const handleContactSupport = () => {
    toast({
      title: "Contact support",
      description: "Our team will help you find relevant programs",
    });
  };

  if (results.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <CardTitle className="text-lg mb-2">
            {currentLanguage === 'hi' ? 'कोई स्थानीय अभियान नहीं मिला' : 'No local programs found'}
          </CardTitle>
          <CardDescription className="max-w-md mb-4">
            {currentLanguage === 'hi' 
              ? 'हमारे पास अभी आपके इलाके के लिए कोई स्थानीय अभियान नहीं मिला। क्या मैं इसे निगरानी में रखूँ?'
              : "We don't have local program data for your area yet. Would you like us to monitor this?"}
          </CardDescription>
      <div className="flex gap-2">
        <Button 
          onClick={handleMonitorRequest}
          className="min-h-[48px]"
          aria-label={currentLanguage === 'hi' ? 'निगरानी सेट करें' : 'Set up monitoring for this program'}
        >
          <Bell className="w-4 h-4 mr-2" aria-hidden="true" />
          {currentLanguage === 'hi' ? 'निगरानी सेट करें' : 'Set up monitoring'}
        </Button>
        <Button 
          variant="outline" 
          onClick={handleContactSupport}
          className="min-h-[48px]"
          aria-label={currentLanguage === 'hi' ? 'सहायता से संपर्क करें' : 'Contact support team'}
        >
          <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
          {currentLanguage === 'hi' ? 'सहायता से संपर्क करें' : 'Contact Support'}
        </Button>
      </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {results.map((result, index) => (
        <Card key={index} className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
                  <span>{result.title}</span>
                  <Badge variant={result.confidence === 'verified' ? 'default' : 'secondary'}>
                    {result.scope} • {result.confidence.toUpperCase()}
                  </Badge>
                </CardTitle>
                {result.description && (
                  <CardDescription className="text-base mt-2">
                    {result.description}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Info Row */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{result.deadline ? `Deadline: ${result.deadline}` : 'No deadline'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{result.scope === 'district' ? district : state}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>Mode: {result.mode}</span>
              </div>
            </div>
            
            {/* How to Apply */}
            {result.howToApply && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-1">How to apply:</p>
                <p className="text-sm text-muted-foreground">{result.howToApply}</p>
              </div>
            )}
            
            {/* Confidence Badge with Tooltip */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {result.confidence === 'verified' ? '✓ VERIFIED' : 
                 result.confidence === 'likely' ? '~ LIKELY' : '👤 COMMUNITY'}
              </Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      {result.confidence === 'verified' ? 'Found on official government source' :
                       result.confidence === 'likely' ? 'Based on government announcements and state rollout patterns' :
                       'User-submitted information — verify before applying'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {result.applyUrl && (
                <Button asChild className="flex-1 min-h-[48px] h-12 min-w-[140px]">
                  <a href={result.applyUrl} target="_blank" rel="noopener noreferrer" aria-label={`Apply to ${result.title} (opens in new tab)`}>
                    <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                    Apply Now
                  </a>
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => handleFindHelpCenter(result)} 
                className="flex-1 min-h-[48px] h-12 min-w-[140px]"
                aria-label={`Find nearest help center for ${result.title}`}
              >
                <MapPin className="w-4 h-4 mr-2" aria-hidden="true" />
                Find Help Center
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleShare(result)} 
                size="icon" 
                className="min-h-[48px] h-12 w-12"
                aria-label={`Share ${result.title}`}
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
            
            {/* Source Footer */}
            {result.source && (
              <div className="text-xs text-muted-foreground border-t pt-3">
                Source: {result.sourceUrl ? (
                  <a href={result.sourceUrl} className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
                    {result.source}
                  </a>
                ) : result.source}
                {result.lastVerified && ` • Last checked: ${new Date(result.lastVerified).toLocaleDateString()}`}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
