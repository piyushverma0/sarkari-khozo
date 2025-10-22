import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ActiveApplication {
  title: string;
  url: string;
  description: string;
  application_deadline: string;
  vacancies: string;
  status: "active" | "closing_soon" | "upcoming";
}

interface ActiveApplicationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
  organizationUrl: string;
  userId: string;
}

export function ActiveApplicationsDialog({
  open,
  onOpenChange,
  organizationName,
  organizationUrl,
  userId,
}: ActiveApplicationsDialogProps) {
  const [applications, setApplications] = useState<ActiveApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchActiveApplications();
    } else {
      setApplications([]);
    }
  }, [open, organizationName, organizationUrl]);

  const fetchActiveApplications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-active-applications', {
        body: { organizationName, organizationUrl }
      });

      if (error) throw error;

      setApplications(data.active_applications || []);
      
      if (!data.active_applications || data.active_applications.length === 0) {
        toast({
          title: "No Active Applications",
          description: "No currently active applications found for this organization.",
        });
      }
    } catch (error) {
      console.error('Error fetching active applications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch active applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackApplication = async (application: ActiveApplication) => {
    setTrackingId(application.title);
    try {
      const { data: processData, error: processError } = await supabase.functions.invoke(
        'process-query',
        { body: { query: application.url } }
      );

      if (processError) throw processError;

      const { data: saveData, error: saveError } = await supabase
        .from('applications')
        .insert({
          user_id: userId,
          title: application.title,
          description: application.description,
          url: application.url,
          application_start_date: new Date().toISOString(),
          application_end_date: application.application_deadline !== 'TBA' ? application.application_deadline : null,
          exam_date: processData.examDate,
          result_date: processData.resultDate,
          fees_summary: application.vacancies !== 'TBA' ? `Vacancies: ${application.vacancies}` : null,
          eligibility_criteria: processData.eligibilityCriteria,
          category: 'jobs',
        })
        .select()
        .single();

      if (saveError) throw saveError;

      toast({
        title: "Application Tracked",
        description: `${application.title} has been added to your dashboard.`,
      });

      navigate(`/application/${saveData.id}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error tracking application:', error);
      toast({
        title: "Error",
        description: "Failed to track application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTrackingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">Open</Badge>;
      case "closing_soon":
        return <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">Closing Soon</Badge>;
      case "upcoming":
        return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400">Upcoming</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Active Applications - {organizationName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No active applications found at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm line-clamp-2 flex-1">{app.title}</h3>
                    {getStatusBadge(app.status)}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {app.description}
                  </p>

                  <div className="space-y-1 mb-3 text-xs">
                    {app.vacancies && app.vacancies !== 'TBA' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vacancies:</span>
                        <span className="font-medium">{app.vacancies}</span>
                      </div>
                    )}
                    {app.application_deadline && app.application_deadline !== 'TBA' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deadline:</span>
                        <span className="font-medium">
                          {new Date(app.application_deadline).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleTrackApplication(app)}
                      disabled={trackingId === app.title}
                    >
                      {trackingId === app.title ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Tracking...
                        </>
                      ) : (
                        'Track Now'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(app.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
