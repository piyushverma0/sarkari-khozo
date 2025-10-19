import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import SavedApplicationsSection from "@/components/SavedApplicationsSection";

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
        {user && <SavedApplicationsSection userId={user.id} />}
      </main>
    </div>
  );
};

export default Index;
