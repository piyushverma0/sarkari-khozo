import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import SchemesList from "@/components/SchemesList";
import { SchemeCardSkeleton } from "@/components/SkeletonLoader";
import type { User } from "@supabase/supabase-js";

const categoryTitles: Record<string, string> = {
  "students": "For Students",
  "farmers": "For Farmers",
  "senior-citizens": "For Senior Citizens",
  "health-insurance": "Health & Insurance",
  "women-children": "For Women & Children",
  "jobs": "Jobs & Employment",
  "startups": "For Startups",
  "entrepreneurs": "For Entrepreneurs",
  "investors": "For Investors",
  "lawyers": "For Lawyers",
};

const Category = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schemes, setSchemes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please sign in to explore categories.",
        });
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });
  }, [navigate, toast]);

  useEffect(() => {
    const fetchSchemes = async () => {
      if (!slug || !user) return;

      const categoryTitle = categoryTitles[slug];
      if (!categoryTitle) {
        toast({
          variant: "destructive",
          title: "Invalid Category",
          description: "The category you're looking for doesn't exist.",
        });
        navigate("/");
        return;
      }

      setIsLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke('find-category-schemes', {
          body: { category: categoryTitle }
        });

        if (error) throw error;

        if (!data || !data.schemes) {
          throw new Error("No schemes found");
        }

        setSchemes(data.schemes);
      } catch (error: any) {
        console.error("Error fetching schemes:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to load schemes. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchemes();
  }, [slug, user, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <Button
              variant="ghost"
              className="mb-6"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <div className="mb-8">
              <div className="h-10 w-64 bg-muted animate-pulse rounded mb-3" />
              <div className="h-6 w-96 bg-muted animate-pulse rounded" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SchemeCardSkeleton />
              <SchemeCardSkeleton />
              <SchemeCardSkeleton />
              <SchemeCardSkeleton />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const categoryTitle = slug ? categoryTitles[slug] : "";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3">{categoryTitle}</h1>
            <p className="text-lg text-muted-foreground">
              Discover government schemes and opportunities tailored for you
            </p>
          </div>

          {schemes.length > 0 ? (
            <SchemesList schemes={schemes} userId={user?.id || ""} />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No schemes found for this category.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Category;
