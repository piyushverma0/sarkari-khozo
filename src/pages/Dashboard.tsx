import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { ApplicationsDashboard } from "@/components/ApplicationsDashboard";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasApplications, setHasApplications] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndOnboarding();
  }, []);

  const checkAuthAndOnboarding = async () => {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user has any applications
    const { data: applications } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    const hasApps = applications && applications.length > 0;
    setHasApplications(hasApps);

    // Check if onboarding was completed
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    
    // Show onboarding if user has applications but hasn't seen the tutorial
    if (hasApps && !onboardingCompleted) {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Applications</h1>
          <p className="text-muted-foreground">
            Track and manage all your applications in one place
          </p>
        </div>

        <ApplicationsDashboard />
      </main>

      <OnboardingTutorial
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
