import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Scheme {
  title: string;
  url: string;
  description?: string;
}

interface SchemesListProps {
  schemes: Scheme[];
  userId: string;
}

const SchemesList = ({ schemes, userId }: SchemesListProps) => {
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleTrackScheme = async (scheme: Scheme) => {
    setTrackingId(scheme.url);

    try {
      // Call process-query with the scheme URL
      const { data, error } = await supabase.functions.invoke('process-query', {
        body: { query: scheme.url }
      });

      if (error) throw error;

      if (!data) {
        throw new Error("No data returned from the AI");
      }

      // Save to database
      const { data: savedApp, error: saveError } = await supabase
        .from('applications')
        .insert({
          user_id: userId,
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
        })
        .select()
        .single();

      if (saveError) throw saveError;

      toast({
        title: "Scheme Tracked!",
        description: "The scheme has been saved successfully.",
      });

      // Navigate to category-aware application detail page
      const categoryPath = (savedApp.category || 'general').toLowerCase();
      navigate(`/category/${categoryPath}/application/${savedApp.id}`);
    } catch (error: any) {
      console.error("Error tracking scheme:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to track scheme. Please try again.",
      });
    } finally {
      setTrackingId(null);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {schemes.map((scheme, index) => (
        <Card key={index} className="animate-fade-in hover-scale">
          <CardHeader>
            <CardTitle className="text-xl">{scheme.title}</CardTitle>
            {scheme.description && (
              <CardDescription className="text-sm line-clamp-2">
                {scheme.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => handleTrackScheme(scheme)}
                disabled={trackingId === scheme.url}
              >
                {trackingId === scheme.url ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Tracking...
                  </>
                ) : (
                  "Track Now"
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                asChild
              >
                <a href={scheme.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SchemesList;
