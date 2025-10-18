import { useState } from "react";
import { Globe, Building2, FileText, Phone, Mail, CheckCircle2, ExternalLink, MapPin, CreditCard, IdCard, FileCheck, Smartphone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface HowToApplySectionProps {
  applicationSteps: string;
  applicationUrl?: string;
}

const HowToApplySection = ({ applicationSteps, applicationUrl }: HowToApplySectionProps) => {
  const [openOption, setOpenOption] = useState<string | null>("online");

  // Check if the content is "not yet released"
  const isNotReleased = applicationSteps.toLowerCase().includes('not yet released') || 
                        applicationSteps.toLowerCase().includes('not released');

  // If it's plain text, show it as before
  const isPlainText = !applicationSteps.toLowerCase().includes('portal') && 
                      !applicationSteps.toLowerCase().includes('csc') &&
                      !applicationSteps.toLowerCase().includes('online');

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

  return (
    <div className="pt-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-base text-muted-foreground">
          You can apply in 3 easy ways — choose what suits you best:
        </p>
      </div>

      {/* Option 1: Apply Online */}
      <Collapsible
        open={openOption === "online"}
        onOpenChange={() => setOpenOption(openOption === "online" ? null : "online")}
      >
        <div className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-base">Option 1: Apply Online</h4>
                  <p className="text-sm text-muted-foreground">Fastest & Recommended</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  10-15 min
                </Badge>
                <ChevronDown className={`w-5 h-5 transition-transform ${openOption === "online" ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-4 border-t">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-base">Visit the official portal and click <strong>"New Registration"</strong> or <strong>"Apply Now"</strong></p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-base">Enter your <strong>Aadhaar Number</strong> and complete the captcha verification</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-base">Select your <strong>State</strong> and <strong>District</strong></p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">4</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-base">Fill in your details — name, address, bank account, and other required information</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">5</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-base">Upload the required documents (Aadhaar, photos, certificates, etc.)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">6</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-base">Review your information and click <strong>Submit</strong></p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-900 dark:text-green-100">
                    <strong>Tip:</strong> You'll get a confirmation message once submitted successfully. Save your application number!
                  </p>
                </div>
              </div>

              {applicationUrl && (
                <Button className="w-full gap-2" size="lg" asChild>
                  <a href={applicationUrl} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4" />
                    Go to Portal
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Option 2: Apply at CSC */}
      <Collapsible
        open={openOption === "csc"}
        onOpenChange={() => setOpenOption(openOption === "csc" ? null : "csc")}
      >
        <div className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-base">Option 2: Apply at Common Service Centre</h4>
                  <p className="text-sm text-muted-foreground">Get help from CSC operator</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${openOption === "csc" ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-4 border-t">
              <p className="text-base text-muted-foreground">
                If you prefer offline assistance, visit your nearest CSC for help with registration.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-base">Visit your nearest Common Service Centre (CSC)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-base">Inform the operator you want to apply for this scheme</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-base">The operator will help you fill and submit the form</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-base">Keep your Aadhaar card and bank details ready</p>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Find nearest CSC:</strong> Search "CSC near me" on Google Maps or ask your local Panchayat office.
                    </p>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full gap-2" size="lg" asChild>
                <a href="https://www.google.com/maps/search/csc+near+me" target="_blank" rel="noopener noreferrer">
                  <MapPin className="w-4 h-4" />
                  Locate Nearest CSC
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Option 3: Apply via State Officials */}
      <Collapsible
        open={openOption === "official"}
        onOpenChange={() => setOpenOption(openOption === "official" ? null : "official")}
      >
        <div className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-base">Option 3: Apply via State Officials</h4>
                  <p className="text-sm text-muted-foreground">Through government offices</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${openOption === "official" ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-4 border-t">
              <p className="text-base text-muted-foreground">
                If online or CSC options aren't available, visit your district office.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-base">Visit your <strong>District Agriculture Office</strong> or <strong>Block-level Nodal Officer</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-base">Carry your documents (Aadhaar, land proof, bank details)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-base">They will verify and register you under the scheme</p>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Document Checklist */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          Quick Checklist — Keep These Ready
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 rounded bg-background">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-sm flex items-center gap-1.5">
              <IdCard className="w-4 h-4" />
              Aadhaar Card
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-background">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-sm flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              Bank Account
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-background">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-sm flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Required Documents
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-background">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-sm flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              Mobile (Aadhaar-linked)
            </span>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="border rounded-lg p-4 bg-primary/5">
        <h4 className="font-semibold text-base mb-3">💬 Need Help?</h4>
        <p className="text-sm text-muted-foreground mb-3">
          If you face any issues while applying, reach out to the helpline:
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 rounded bg-background">
            <Phone className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm">Helpline: <strong>155261</strong> / <strong>011-24300606</strong></span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-background">
            <Mail className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm break-all">Email: <strong>pmkisan-ict@gov.in</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToApplySection;
