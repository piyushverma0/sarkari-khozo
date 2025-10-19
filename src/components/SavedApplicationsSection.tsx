import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SavedApplicationCard from "./SavedApplicationCard";
import { SavedApplicationSkeleton } from "./SkeletonLoader";
import { FolderOpen } from "lucide-react";

interface SavedApplicationsSectionProps {
  userId: string;
}

const SavedApplicationsSection = ({ userId }: SavedApplicationsSectionProps) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false });

        if (error) throw error;

        setApplications(data || []);
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();

    // Set up real-time subscription for new applications
    const channel = supabase
      .channel('applications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'applications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New application added:', payload);
          setApplications((current) => [payload.new as any, ...current]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Application updated:', payload);
          setApplications((current) =>
            current.map((app) =>
              app.id === (payload.new as any).id ? (payload.new as any) : app
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'applications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Application deleted:', payload);
          setApplications((current) =>
            current.filter((app) => app.id !== (payload.old as any).id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (isLoading) {
    return (
      <section className="py-16 px-4 bg-gradient-to-b from-transparent to-background/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8">Your Saved Applications</h2>
          <div className="space-y-4">
            <SavedApplicationSkeleton />
            <SavedApplicationSkeleton />
            <SavedApplicationSkeleton />
          </div>
        </div>
      </section>
    );
  }

  if (applications.length === 0) {
    return (
      <section className="py-16 px-4 bg-gradient-to-b from-transparent to-background/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8">Your Saved Applications</h2>
          <div className="glass-card rounded-2xl p-12 text-center space-y-4">
            <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-muted-foreground">No Applications Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Start tracking your applications by searching above or exploring categories. 
              All your tracked applications will appear here.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-transparent to-background/50">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl font-bold mb-8">
          Your Saved Applications
          <span className="ml-3 text-lg font-normal text-muted-foreground">
            ({applications.length})
          </span>
        </h2>
        
        <div className="space-y-4">
          {applications.map((app) => (
            <SavedApplicationCard
              key={app.id}
              id={app.id}
              title={app.title}
              description={app.description || ""}
              savedAt={new Date(app.saved_at)}
              category={app.category}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SavedApplicationsSection;
