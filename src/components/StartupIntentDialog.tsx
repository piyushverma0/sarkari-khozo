import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type IntentType = "funding" | "incubation" | "policy" | "explore" | null;

interface StartupIntentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intentType: IntentType;
}

const INDIAN_STATES = [
  "All India",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const StartupIntentDialog = ({ open, onOpenChange, intentType }: StartupIntentDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    stage: "",
    sector: "",
    state: "",
    dpiitRecognition: "",
  });

  const totalSteps = intentType === "explore" ? 0 : 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please sign in to continue.",
        });
        navigate("/auth");
        return;
      }

      if (intentType === "explore") {
        // Navigate to generic category page for explore all
        navigate("/category/startups");
        onOpenChange(false);
        return;
      }

      // Generate natural language query based on intent and form data
      let query = "";
      const programType = intentType === "funding" ? "funding" : 
                         intentType === "incubation" ? "incubation and accelerator" : 
                         "policy benefits and tax incentives";

      query = `Find ${programType} programs for startups`;
      
      if (formData.stage) query += ` at ${formData.stage} stage`;
      if (formData.sector && formData.sector !== "Other") query += ` in ${formData.sector} sector`;
      if (formData.state && formData.state !== "All India") query += ` in ${formData.state}`;
      if (formData.dpiitRecognition === "Yes") query += ` (DPIIT recognized)`;
      
      // Store query parameters for the results page
      const searchParams = new URLSearchParams({
        query,
        intentType: intentType || "",
        stage: formData.stage,
        sector: formData.sector,
        state: formData.state,
        dpiit: formData.dpiitRecognition,
      });

      // Navigate to results (we'll use the generic category page for now, can enhance later)
      navigate(`/category/startups?${searchParams.toString()}`);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error processing intent:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process your request. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isStepComplete = () => {
    switch (currentStep) {
      case 1:
        return formData.stage !== "";
      case 2:
        return formData.sector !== "";
      case 3:
        return formData.state !== "";
      case 4:
        return formData.dpiitRecognition !== "";
      default:
        return false;
    }
  };

  const getDialogTitle = () => {
    if (intentType === "funding") return "Find Startup Funding";
    if (intentType === "incubation") return "Find Incubation Program";
    if (intentType === "policy") return "Find Policy Benefits";
    if (intentType === "explore") return "Explore All Opportunities";
    return "";
  };

  const getDialogDescription = () => {
    if (intentType === "explore") {
      return "Browsing all available startup programs and schemes...";
    }
    return `Answer a few quick questions to get personalized recommendations (Step ${currentStep} of ${totalSteps})`;
  };

  // Handle explore all directly
  if (intentType === "explore" && open) {
    handleSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        {intentType !== "explore" && (
          <div className="space-y-6">
            {/* Step 1: Stage */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">What's your startup's stage?</Label>
                <RadioGroup
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                >
                  {["Idea", "Prototype", "Revenue", "Growth"].map((stage) => (
                    <div key={stage} className="flex items-center space-x-2">
                      <RadioGroupItem value={stage} id={stage} />
                      <Label htmlFor={stage} className="cursor-pointer">
                        {stage}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Step 2: Sector */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">What's your sector?</Label>
                <Select
                  value={formData.sector}
                  onValueChange={(value) => setFormData({ ...formData, sector: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your sector" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {["Tech", "AgriTech", "HealthTech", "FinTech", "EdTech", "E-commerce", "CleanTech", "Other"].map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 3: State */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Which state are you based in?</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 4: DPIIT Recognition */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">Do you have DPIIT Recognition?</Label>
                <RadioGroup
                  value={formData.dpiitRecognition}
                  onValueChange={(value) => setFormData({ ...formData, dpiitRecognition: value })}
                >
                  {["Yes", "No", "Applied"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`dpiit-${option}`} />
                      <Label htmlFor={`dpiit-${option}`} className="cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || isLoading}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!isStepComplete() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : currentStep === totalSteps ? (
                  "Find Programs"
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StartupIntentDialog;
