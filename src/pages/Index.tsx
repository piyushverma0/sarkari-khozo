import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import { AudioNewsBanner } from "@/components/AudioNewsBanner";
import CategoriesSection from "@/components/CategoriesSection";
import SavedApplicationsSection from "@/components/SavedApplicationsSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthRequired = () => {
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection user={user} onAuthRequired={handleAuthRequired} />
        <AudioNewsBanner />
        <CategoriesSection user={user} onAuthRequired={handleAuthRequired} />

        {user && <SavedApplicationsSection userId={user.id} />}

        <TestimonialsSection />
      </main>
      <footer className="py-8 bg-transparent border-t">
        <div className="container mx-auto text-center space-y-3">
          <p className="text-sm text-foreground">
            © 2025 All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with ❤️ by Piyush
          </p>
          <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground">
            <Link 
              to="/privacy-policy" 
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <span>|</span>
            <Link 
              to="/terms-of-service" 
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
