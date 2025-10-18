import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import ApplicationCard from "@/components/ApplicationCard";
import { ApplicationCardSkeleton } from "@/components/SkeletonLoader";

const Application = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [application, setApplication] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchApplication = async () => {
      // Check if application data was passed via state (from AI search results)
      if (location.state?.application) {
        setApplication(location.state.application);
        setIsLoading(false);
        return;
      }

      // Otherwise, fetch from database using ID (for saved applications)
      if (!id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No application data found.",
        });
        navigate("/");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (!data) {
          throw new Error("Application not found");
        }

        setApplication(data);
      } catch (error: any) {
        console.error("Error fetching application:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to load application.",
        });
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplication();
  }, [id, navigate, toast, location.state]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <Button
              variant="ghost"
              className="mb-6"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <ApplicationCardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          {application && <ApplicationCard application={application} />}
        </div>
      </main>
    </div>
  );
};

export default Application;
