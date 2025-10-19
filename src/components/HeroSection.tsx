import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OpportunitySelectionDialog } from "@/components/OpportunitySelectionDialog";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { useRotatingPlaceholder } from "@/hooks/useRotatingPlaceholder";

interface Opportunity {
  title: string;
  description: string;
  application_status: string;
  deadline: string;
  category: string;
  url?: string;
}

interface DisambiguationData {
  is_ambiguous: boolean;
  organization_name: string;
  active_opportunities: Opportunity[];
  expired_opportunities: Opportunity[];
}

interface HeroSectionProps {
  user: User | null;
  onAuthRequired: () => void;
}

const HeroSection = ({ user, onAuthRequired }: HeroSectionProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [disambiguationData, setDisambiguationData] = useState<DisambiguationData | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const placeholder = useRotatingPlaceholder();

  const handleTrackApplication = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to track applications.",
      });
      onAuthRequired();
      return;
    }

    if (!query.trim()) {
      toast({
        variant: "destructive",
        title: "Query Required",
        description: "Please enter an exam, job, or scheme name.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-query', {
        body: { query: query.trim() }
      });

      if (error) throw error;

      if (!data) {
        throw new Error("No data returned from the AI");
      }

      // Check if response indicates ambiguous query
      if (data.is_ambiguous) {
        console.log('Ambiguous query detected, showing disambiguation dialog');
        setDisambiguationData(data as DisambiguationData);
        setShowDisambiguation(true);
        setIsLoading(false);
        return;
      }

      // Save to database
      const { data: savedApp, error: saveError } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description,
          url: data.url,
          category: data.category || null,
          important_dates: data.important_dates || null,
          eligibility: data.eligibility || null,
          application_steps: data.application_steps || null,
          documents_required: data.documents_required || null,
          fee_structure: data.fee_structure || null,
          deadline_reminders: data.deadline_reminders || null,
          application_guidance: data.application_guidance || null,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      toast({
        title: "Application Tracked!",
        description: "Your application has been saved successfully.",
      });

      // Navigate to category-aware application detail page
      const categoryPath = (savedApp.category || 'general').toLowerCase();
      navigate(`/category/${categoryPath}/application/${savedApp.id}`);
    } catch (error: any) {
      console.error("Error tracking application:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to track application. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpportunitySelected = async (opportunity: Opportunity) => {
    setShowDisambiguation(false);
    setIsLoading(true);

    try {
      // Call process-query again with the specific opportunity title
      const { data, error } = await supabase.functions.invoke('process-query', {
        body: { query: opportunity.title }
      });

      if (error) throw error;

      if (!data || data.is_ambiguous) {
        throw new Error("Failed to get specific opportunity details");
      }

      // Save to database
      const { data: savedApp, error: saveError } = await supabase
        .from('applications')
        .insert({
          user_id: user!.id,
          title: data.title,
          description: data.description,
          url: data.url,
          category: data.category || null,
          important_dates: data.important_dates || null,
          eligibility: data.eligibility || null,
          application_steps: data.application_steps || null,
          documents_required: data.documents_required || null,
          fee_structure: data.fee_structure || null,
          deadline_reminders: data.deadline_reminders || null,
          application_guidance: data.application_guidance || null,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      toast({
        title: "Application Tracked!",
        description: "Your application has been saved successfully.",
      });

      // Navigate to category-aware application detail page
      const categoryPath = (savedApp.category || 'general').toLowerCase();
      navigate(`/category/${categoryPath}/application/${savedApp.id}`);
    } catch (error: any) {
      console.error("Error tracking selected opportunity:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to track application. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <OpportunitySelectionDialog
        isOpen={showDisambiguation}
        organizationName={disambiguationData?.organization_name || ""}
        activeOpportunities={disambiguationData?.active_opportunities || []}
        expiredOpportunities={disambiguationData?.expired_opportunities || []}
        onSelect={handleOpportunitySelected}
        onClose={() => setShowDisambiguation(false)}
      />
    <section className="pt-32 pb-16 px-4">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Track Exams, Jobs & Government Schemes — All in One Place
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Just tell our AI what you're applying for. It will find the form, extract the details, and create a trackable card for you. Never miss a deadline again.
        </p>

        <div className="glass-card rounded-2xl p-8 max-w-3xl mx-auto shadow-[var(--shadow-card)] border-2 border-primary/20 bg-card/40">
          <div className="relative mb-4">
            <SearchAutocomplete
              value={query}
              onChange={setQuery}
              onSelect={(value) => {
                setQuery(value);
                // Trigger tracking after brief delay to show selection
                setTimeout(() => handleTrackApplication(), 100);
              }}
              placeholder={placeholder}
              disabled={!user || isLoading}
            />
          </div>
          
          <Button 
            size="lg" 
            className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
            onClick={handleTrackApplication}
            disabled={!user || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analyzing Your Request...
              </>
            ) : user ? (
              "Track My Application"
            ) : (
              "Sign In to Track"
            )}
          </Button>
        </div>
      </div>
    </section>
    </>
  );
};

export default HeroSection;
