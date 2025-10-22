import { useState } from "react";
import { Globe, Building2, FileText, CheckCircle2, ExternalLink, MapPin, Clock, RefreshCw, AlertCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CSCLocatorDialog from "./CSCLocatorDialog";

interface HowToApplySectionProps {
  applicationSteps: string;
  applicationUrl?: string;
  applicationGuidance?: any;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export interface ApplicationGuidanceData {
  helpline?: string;
  email?: string;
}

const HowToApplySection = ({
  applicationSteps,
  applicationUrl,
  applicationGuidance,
  onRefresh,
  isRefreshing = false
}: HowToApplySectionProps) => {
  const [openOption, setOpenOption] = useState<string | null>("online");
  const [locatorOpen, setLocatorOpen] = useState(false);

  // Check if we have structured guidance from AI
  const hasGuidance = applicationGuidance && applicationGuidance.online_steps && applicationGuidance.online_steps.length > 0;

  // Check if the content is "not yet released"
  const isNotReleased = applicationSteps.toLowerCase().includes('not yet released') || applicationSteps.toLowerCase().includes('not released');

  // If we don't have structured guidance and it's plain text, show it as before
  const isPlainText = !hasGuidance && !applicationSteps.toLowerCase().includes('portal') && !applicationSteps.toLowerCase().includes('csc') && !applicationSteps.toLowerCase().includes('online');
  if (isPlainText && !isNotReleased) {
    return (
      <div className="pt-2 space-y-2">
        {isNotReleased && (
          <div className="p-3 bg-muted/50 rounded-lg mb-3">
            <p className="text-base">
              We'll update full steps when the official notice is released. For now, here's what last year's process looked like 👇
            </p>
          </div>
        )}
        <div className="text-base leading-relaxed whitespace-pre-line">
          {applicationSteps}
        </div>
      </div>
    );
  }

  // Use AI-generated guidance if available, otherwise use defaults
  const defaultSteps = [
    "Visit the official portal and click on 'New Registration' or 'Apply Now'",
    "Enter your Aadhaar Number and complete the captcha verification",
    "Select your State and District",
    "Fill in your details — name, address, bank account, and other required information",
    "Upload the required documents (Aadhaar, photos, certificates, etc.)",
    "Review your information and click Submit"
  ];

  // Validate and filter online_steps to ensure only strings
  const onlineSteps = hasGuidance && Array.isArray(applicationGuidance.online_steps)
    ? applicationGuidance.online_steps.filter((step: any) => typeof step === 'string')
    : defaultSteps;

  // Fallback if filtered array is empty
  const validOnlineSteps = onlineSteps.length > 0 ? onlineSteps : defaultSteps;

  const cscApplicable = hasGuidance ? applicationGuidance.csc_applicable !== false : true;
  const cscGuidance = hasGuidance && applicationGuidance.csc_guidance 
    ? applicationGuidance.csc_guidance 
    : "If you prefer offline assistance, visit your nearest CSC for help with registration.";

  const stateOfficialsApplicable = hasGuidance ? applicationGuidance.state_officials_applicable !== false : true;
  const stateOfficialsGuidance = hasGuidance && applicationGuidance.state_officials_guidance
    ? applicationGuidance.state_officials_guidance
    : "If online or CSC options aren't available, visit your district office.";

  const helpline = hasGuidance && applicationGuidance.helpline ? applicationGuidance.helpline : "Check official website for helpline";
  const email = hasGuidance && applicationGuidance.email ? applicationGuidance.email : "Check official website for email";
  const estimatedTime = hasGuidance && applicationGuidance.estimated_time ? applicationGuidance.estimated_time : "10-15 min";

  return (
    <div className="pt-3 sm:pt-4 space-y-4 sm:space-y-6">
      {/* Show refresh banner if no structured guidance */}
      {!hasGuidance && onRefresh && (
        <Alert className="border-amber-500/50 bg-amber-500/10 p-3 sm:p-4">
          <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <span className="text-xs sm:text-sm">Showing generic guidance. Refresh to get scheme-specific details.</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isRefreshing}
              className="sm:ml-2 h-8 text-xs sm:text-sm w-full sm:w-auto"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Header */}
      <div className="space-y-2">
        <p className="text-sm sm:text-base text-muted-foreground">
          You can apply in {cscApplicable && stateOfficialsApplicable ? "3" : cscApplicable || stateOfficialsApplicable ? "2" : "1"} easy way{(cscApplicable || stateOfficialsApplicable) ? "s" : ""} — choose what suits you best:
        </p>
      </div>

      {/* Option 1: Apply Online */}
      <Collapsible open={openOption === "online"} onOpenChange={() => setOpenOption(openOption === "online" ? null : "online")}>
        <div className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="text-left min-w-0">
                  <h4 className="font-semibold text-sm sm:text-base">Option 1: Apply Online</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Fastest & Recommended</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden xs:inline">{estimatedTime}</span>
                  <span className="xs:hidden">{estimatedTime.split(' ')[0]}</span>
                </Badge>
                <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${openOption === "online" ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 sm:p-4 pt-0 space-y-3 sm:space-y-4 border-t">
              <div className="space-y-2 sm:space-y-3">
                {validOnlineSteps.map((step, index) => {
                  // Runtime validation to ensure step is a string
                  if (typeof step !== 'string') {
                    console.warn('Invalid step at index', index, ':', step);
                    return null;
                  }
                  return (
                    <div key={index} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/30">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] sm:text-xs font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base">{step}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-2 sm:p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-start gap-1.5 sm:gap-2">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-green-500">
                    <strong>Tip:</strong> You'll get a confirmation message once submitted successfully. Save your application number!
                  </p>
                </div>
              </div>

              {applicationUrl && (
                <Button className="w-full gap-2 h-10 sm:h-11 text-sm sm:text-base" size="lg" asChild>
                  <a href={applicationUrl} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Go to Portal
                    <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </a>
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Option 2: Apply at CSC */}
      {cscApplicable && (
        <Collapsible open={openOption === "csc"} onOpenChange={() => setOpenOption(openOption === "csc" ? null : "csc")}>
          <div className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="text-left min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base">Option {stateOfficialsApplicable ? "2" : "2"}: Apply at CSC</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Get help from CSC operator</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform flex-shrink-0 ${openOption === "csc" ? "rotate-180" : ""}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 sm:p-4 pt-0 space-y-3 sm:space-y-4 border-t">
                <p className="text-sm sm:text-base text-muted-foreground">
                  {cscGuidance}
                </p>

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm sm:text-base">Visit your nearest Common Service Centre (CSC)</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm sm:text-base">Inform the operator you want to apply for this scheme</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm sm:text-base">The operator will help you fill and submit the form</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm sm:text-base">Keep your Aadhaar card and bank details ready</p>
                  </div>
                </div>

                <div className="p-2 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start gap-1.5 sm:gap-2">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm text-blue-500">
                        <strong>Find nearest CSC:</strong> Search "CSC near me" on Google Maps or ask your local Panchayat office.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full gap-2 h-10 sm:h-11 text-sm sm:text-base" 
                  size="lg"
                  onClick={() => setLocatorOpen(true)}
                >
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Locate Nearest CSC
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Option 3: Apply via State Officials */}
      {stateOfficialsApplicable && (
        <Collapsible open={openOption === "official"} onOpenChange={() => setOpenOption(openOption === "official" ? null : "official")}>
          <div className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="text-left min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base">Option {cscApplicable ? "3" : "2"}: Via State Officials</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Through government offices</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform flex-shrink-0 ${openOption === "official" ? "rotate-180" : ""}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 sm:p-4 pt-0 space-y-3 sm:space-y-4 border-t">
                <p className="text-sm sm:text-base text-muted-foreground">
                  {stateOfficialsGuidance}
                </p>

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm sm:text-base">Visit your relevant district or block office</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm sm:text-base">Carry your documents (Aadhaar, relevant certificates, bank details)</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm sm:text-base">They will verify and register you under the scheme</p>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      <CSCLocatorDialog open={locatorOpen} onOpenChange={setLocatorOpen} />
    </div>
  );
};

export default HowToApplySection;
