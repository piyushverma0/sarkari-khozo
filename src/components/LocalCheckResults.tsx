import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, MapPin, FileText, ExternalLink, Share2, Info, AlertCircle, Bell, Mail, Volume2, ChevronDown, Building2, Clock } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useState } from "react";

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
  const { speak, stop, isSpeaking } = useTextToSpeech();

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

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'verified':
        return { variant: 'success' as const, icon: '🟢', label: 'Active / Confirmed' };
      case 'likely':
        return { variant: 'warning' as const, icon: '🟡', label: 'Likely Active' };
      default:
        return { variant: 'outline' as const, icon: '⚪', label: 'Unverified' };
    }
  };

  const getShortSummary = (description?: string) => {
    if (!description) return "Support center active in your district.";
    const firstSentence = description.split('.')[0];
    return firstSentence.length > 150 ? firstSentence.substring(0, 150) + '...' : firstSentence + '.';
  };

  const extractStepsFromDescription = (description?: string, howToApply?: string): string[] => {
    const text = howToApply || description || '';
    
    // Try to find numbered steps
    const numberedSteps = text.match(/\d+\.\s*\*\*[^*]+\*\*[^]+?(?=\d+\.\s*\*\*|\*\*(?:In summary|Source)|$)/g);
    if (numberedSteps && numberedSteps.length > 0) {
      return numberedSteps.map(step => step.trim());
    }
    
    // Fallback to simple steps
    return [
      "Visit your nearest CSC or District Office.",
      `Ask for "${text.includes('(MSK)') ? 'Mahila Shakti Kendra' : 'program information'}".`,
      "Bring Aadhaar & any ID proof.",
      "They will help you register or get guidance."
    ];
  };

  return (
    <div className="space-y-4 mt-4">
      {results.map((result, index) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const confidenceBadge = getConfidenceBadge(result.confidence);
        const shortSummary = getShortSummary(result.description);
        const steps = extractStepsFromDescription(result.description, result.howToApply);
        
        return (
          <Card key={index} className="overflow-hidden">
            {/* 🟦 HEADER BLOCK */}
            <CardHeader className="pb-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2 leading-tight">
                    {result.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium">
                      {district ? `${district}, ${state}` : state}
                    </span>
                    <span className="text-muted-foreground/60">|</span>
                    <Badge variant={confidenceBadge.variant} className="text-xs">
                      {confidenceBadge.icon} {confidenceBadge.label}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Quick tagline */}
              <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
                "{getShortSummary(result.description)}"
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 🧭 QUICK SUMMARY */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed flex-1">
                    {shortSummary}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8"
                    onClick={() => isSpeaking ? stop() : speak(shortSummary)}
                    aria-label="Listen to summary"
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-primary' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* 📅 KEY INFO BLOCK */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-card border rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-medium truncate">{confidenceBadge.label}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium truncate">{district || state}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Deadline</p>
                    <p className="text-sm font-medium">{result.deadline || 'No deadline'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Mode</p>
                    <p className="text-sm font-medium capitalize">{result.mode === 'csc' ? 'Offline + CSC' : result.mode}</p>
                  </div>
                </div>
                
                {result.contactInfo && (result.contactInfo.phone || result.contactInfo.email) && (
                  <div className="col-span-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Local Office</p>
                      <p className="text-sm font-medium truncate">
                        {result.contactInfo.phone || result.contactInfo.email || 'District Hub'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 🧾 HOW TO APPLY BLOCK */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  How to Apply
                </h4>
                
                <ol className="space-y-2 list-none">
                  {steps.slice(0, 4).map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5 flex-1">{step.replace(/^\d+\.\s*\*\*|\*\*/g, '').trim()}</span>
                    </li>
                  ))}
                </ol>

                {result.description && result.description.length > 300 && (
                  <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-center gap-2 h-9">
                        <FileText className="w-4 h-4" />
                        {isExpanded ? 'Hide' : 'View'} detailed steps
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-3 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground leading-relaxed">
                        {result.description}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {result.applyUrl && (
                  <Button asChild className="flex-1 min-h-[48px] h-12 min-w-[140px]">
                    <a href={result.applyUrl} target="_blank" rel="noopener noreferrer" aria-label={`Apply to ${result.title}`}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Apply Now
                    </a>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => handleFindHelpCenter(result)} 
                  className="flex-1 min-h-[48px] h-12 min-w-[140px]"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Find Help Center
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleShare(result)} 
                  size="icon" 
                  className="min-h-[48px] h-12 w-12"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              {/* 📚 FOOTNOTE */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-muted-foreground">
                      <span className="font-medium">Source:</span> {result.sourceUrl ? (
                        <a href={result.sourceUrl} className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
                          {result.source}
                        </a>
                      ) : result.source || 'Government reports, district websites & AI analysis'}
                      {result.lastVerified && <span className="text-muted-foreground/60"> • Last checked: {new Date(result.lastVerified).toLocaleDateString()}</span>}
                    </p>
                    <p className="text-muted-foreground/80 flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>Confirm at your nearest CSC or official office before visiting.</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
