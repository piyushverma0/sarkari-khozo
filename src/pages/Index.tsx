import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Newspaper, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import SavedApplicationsSection from "@/components/SavedApplicationsSection";
import { TopStoriesPreview } from "@/components/discover/TopStoriesPreview";

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
        <CategoriesSection user={user} onAuthRequired={handleAuthRequired} />
        
        {/* Latest Updates Section */}
        <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto max-w-6xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <Newspaper className="w-8 h-8" />
                  Latest Updates
                </h2>
                <p className="text-muted-foreground mt-2">
                  Stay informed about new schemes, exams, and opportunities
                </p>
              </div>
              <Button onClick={() => navigate('/discover')}>
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            <TopStoriesPreview />
          </div>
        </section>

        {user && <SavedApplicationsSection userId={user.id} />}
      </main>
      <footer className="py-8 bg-transparent">
        <div className="container mx-auto text-center space-y-2">
          <p className="text-sm text-foreground">
            © 2025 All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with ❤️ by Piyush
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
