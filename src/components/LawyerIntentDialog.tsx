import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type IntentType = "judiciary" | "fellowships" | "internships" | "schemes" | null;

interface Program {
  id?: string;
  title: string;
  description: string;
  url?: string;
  program_type?: string;
  funding_amount?: string;
  eligibility?: string;
  duration?: string;
  location?: string;
  documents_required?: any;
  important_dates?: any;
  application_process?: string;
}

interface LawyerIntentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intentType: IntentType;
  onComplete: (programs: Program[], query: string) => void;
}

const states = [
  "Pan-India", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const LawyerIntentDialog = ({ open, onOpenChange, intentType, onComplete }: LawyerIntentDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    profile: "",
    state: "",
    preference: "",
  });

  const handleNext = () => {
    if (currentStep < 3) {
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to continue",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      let query = "";
      const profileText = formData.profile === "student" ? "law students" : 
                         formData.profile === "graduate" ? "law graduates" :
                         formData.profile === "advocate" ? "practicing lawyers" : "legal professionals";

      if (intentType === "judiciary") {
        query = `Find judiciary exams and judicial service notifications in ${formData.state || "India"} for ${profileText}`;
      } else if (intentType === "fellowships") {
        query = `Find legal fellowships and research opportunities in ${formData.state || "India"} for ${profileText}`;
      } else if (intentType === "internships") {
        query = `Find legal internships and clerkships in ${formData.state || "India"} for ${profileText}`;
      } else if (intentType === "schemes") {
        query = `Find legal aid programs and government schemes in ${formData.state || "India"} for ${profileText}`;
      }

      if (formData.preference === "government") {
        query += ", focusing on government programs";
      } else if (formData.preference === "ngo") {
        query += ", including NGO and non-profit opportunities";
      }

      const { data, error } = await supabase.functions.invoke('find-lawyer-programs', {
        body: { query, intentType }
      });

      if (error) throw error;

      const programs = data?.programs || [];
      
      toast({
        title: "Programs found!",
        description: `Found ${programs.length} matching opportunities`,
      });

      onComplete(programs, query);
      
      setCurrentStep(1);
      setFormData({ profile: "", state: "", preference: "" });
      
    } catch (error) {
      console.error('Error finding programs:', error);
      toast({
        title: "Error",
        description: "Failed to find programs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isStepComplete = () => {
    if (currentStep === 1) return formData.profile !== "";
    if (currentStep === 2) return formData.state !== "";
    if (currentStep === 3) return formData.preference !== "";
    return false;
  };

  const getDialogTitle = () => {
    if (intentType === "judiciary") return "Find Judiciary Exams";
    if (intentType === "fellowships") return "Find Legal Fellowships";
    if (intentType === "internships") return "Find Internships";
    if (intentType === "schemes") return "Find Legal Aid Programs";
    return "Find Legal Opportunities";
  };

  const getDialogDescription = () => {
    if (currentStep === 1) return "Tell us about your professional profile";
    if (currentStep === 2) return "Which state are you interested in?";
    if (currentStep === 3) return "What type of programs do you prefer?";
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress indicator */}
          <div className="flex gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Profile */}
          {currentStep === 1 && (
            <RadioGroup
              value={formData.profile}
              onValueChange={(value) => setFormData({ ...formData, profile: value })}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent">
                <RadioGroupItem value="student" id="student" />
                <Label htmlFor="student" className="flex-1 cursor-pointer">
                  Law Student
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent">
                <RadioGroupItem value="graduate" id="graduate" />
                <Label htmlFor="graduate" className="flex-1 cursor-pointer">
                  Law Graduate (Fresh)
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent">
                <RadioGroupItem value="advocate" id="advocate" />
                <Label htmlFor="advocate" className="flex-1 cursor-pointer">
                  Practicing Lawyer
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent">
                <RadioGroupItem value="researcher" id="researcher" />
                <Label htmlFor="researcher" className="flex-1 cursor-pointer">
                  Legal Researcher
                </Label>
              </div>
            </RadioGroup>
          )}

          {/* Step 2: State */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 3: Preference */}
          {currentStep === 3 && (
            <RadioGroup
              value={formData.preference}
              onValueChange={(value) => setFormData({ ...formData, preference: value })}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent">
                <RadioGroupItem value="government" id="government" />
                <Label htmlFor="government" className="flex-1 cursor-pointer">
                  Government Programs
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent">
                <RadioGroupItem value="ngo" id="ngo" />
                <Label htmlFor="ngo" className="flex-1 cursor-pointer">
                  NGO & Non-Profit
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border cursor-pointer hover:bg-accent">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="flex-1 cursor-pointer">
                  Both
                </Label>
              </div>
            </RadioGroup>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!isStepComplete() || isLoading}
            className="flex-1"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStep === 3 ? "Find Programs" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LawyerIntentDialog;
