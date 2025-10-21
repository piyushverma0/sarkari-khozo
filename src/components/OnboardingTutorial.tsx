import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Bell, Calendar, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingTutorialProps {
  open: boolean;
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to Application Tracker!",
    description: "Let's get you started with tracking your applications. This quick tutorial will show you how to make the most of the platform.",
    icon: CheckCircle,
  },
  {
    title: "Confirmation Workflow",
    description: "When you track an application, you'll be asked to confirm when you've actually applied. This helps us send you accurate reminders and track your progress.",
    icon: Calendar,
  },
  {
    title: "Stay Updated with Notifications",
    description: "Enable push notifications to get instant alerts about deadlines, admit cards, results, and important updates. You can customize when and how you receive them.",
    icon: Bell,
  },
  {
    title: "Organize Your Applications",
    description: "Use filters to view applications by status, sort by deadline, and get quick insights on your dashboard. You're all set to start tracking!",
    icon: Filter,
  },
];

export function OnboardingTutorial({ open, onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();
  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Mark onboarding as completed
        const { error } = await supabase
          .from('profiles')
          .update({ 
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
        
        // Store in localStorage as well
        localStorage.setItem('onboarding_completed', 'true');
      }

      toast({
        title: "Tutorial Complete!",
        description: "You're ready to track your applications.",
      });

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still complete the tutorial even if there's an error
      localStorage.setItem('onboarding_completed', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mb-4 mx-auto rounded-full bg-primary/10">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{currentStepData.title}</DialogTitle>
          <DialogDescription className="text-center">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-2 my-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentStep
                  ? "bg-primary"
                  : index < currentStep
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full sm:w-auto"
          >
            Skip Tutorial
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 sm:flex-none"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1 sm:flex-none"
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Next"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
