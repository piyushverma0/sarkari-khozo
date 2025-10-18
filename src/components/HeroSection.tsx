import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

interface HeroSectionProps {
  user: User | null;
  onAuthRequired: () => void;
}

const HeroSection = ({ user, onAuthRequired }: HeroSectionProps) => {
  const { toast } = useToast();

  const handleClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to track applications.",
      });
      onAuthRequired();
    }
  };

  return (
    <section className="pt-32 pb-16 px-4">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Track Exams, Jobs & Government Schemes — All in One Place
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Just tell our AI what you're applying for. It will find the form, extract the details, and create a trackable card for you. Never miss a deadline again.
        </p>

        <div className="glass-card rounded-2xl p-8 max-w-3xl mx-auto shadow-[var(--shadow-card)]">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder='Enter exam, job, or scheme name... e.g., "SSC CGL 2024" or "PM Kisan Yojana"'
              className="pl-12 h-14 text-base bg-input/50 border-border/50 focus-visible:ring-primary"
              disabled={!user}
              onClick={!user ? handleClick : undefined}
            />
          </div>
          
          <Button 
            size="lg" 
            className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleClick}
            disabled={!user}
          >
            {user ? "Track My Application" : "Sign In to Track"}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
