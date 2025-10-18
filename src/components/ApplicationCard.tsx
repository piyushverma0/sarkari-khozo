import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Calendar, FileText, DollarSign, ClipboardList, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ApplicationData {
  id?: string;
  title: string;
  description: string;
  url?: string;
  category?: string;
  important_dates?: any;
  eligibility?: string;
  application_steps?: string;
  documents_required?: any;
  fee_structure?: string;
  deadline_reminders?: any;
}

interface ApplicationCardProps {
  application: ApplicationData;
}

const ApplicationCard = ({ application }: ApplicationCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!application.id) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', application.id);

      if (error) throw error;

      toast({
        title: "Application Deleted",
        description: "The application has been removed from your saved list.",
      });

      navigate("/");
    } catch (error: any) {
      console.error("Error deleting application:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete application.",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const importantDates = application.important_dates 
    ? (typeof application.important_dates === 'string' 
        ? JSON.parse(application.important_dates) 
        : application.important_dates)
    : null;

  const documentsRequired = application.documents_required
    ? (typeof application.documents_required === 'string'
        ? JSON.parse(application.documents_required)
        : application.documents_required)
    : null;

  const deadlineReminders = application.deadline_reminders
    ? (typeof application.deadline_reminders === 'string'
        ? JSON.parse(application.deadline_reminders)
        : application.deadline_reminders)
    : null;

  return (
    <Card className="w-full animate-fade-in">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-2xl">{application.title}</CardTitle>
            {application.category && (
              <Badge variant="secondary">{application.category}</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {application.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={application.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Official Page
                </a>
              </Button>
            )}
            {application.id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Application?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove this application from your saved list. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        {application.description && (
          <CardDescription className="text-base mt-4">
            {application.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Important Dates */}
        {importantDates && Object.keys(importantDates).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Important Dates</h3>
            </div>
            <div className="space-y-2 pl-7">
              {Object.entries(importantDates).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="font-medium">{value as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deadline Reminders */}
        {deadlineReminders && deadlineReminders.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Deadline Reminders</h3>
              <div className="space-y-2">
                {deadlineReminders.map((reminder: any, index: number) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{reminder.days_before} days before</p>
                    <p className="text-sm text-muted-foreground">{reminder.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Eligibility */}
        {application.eligibility && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Eligibility Criteria</h3>
              </div>
              <p className="text-muted-foreground pl-7 whitespace-pre-line">
                {application.eligibility}
              </p>
            </div>
          </>
        )}

        {/* Documents Required */}
        {documentsRequired && documentsRequired.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Documents Required</h3>
              </div>
              <ul className="space-y-2 pl-7">
                {documentsRequired.map((doc: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Fee Structure */}
        {application.fee_structure && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Fee Structure</h3>
              </div>
              <p className="text-muted-foreground pl-7 whitespace-pre-line">
                {application.fee_structure}
              </p>
            </div>
          </>
        )}

        {/* Application Steps */}
        {application.application_steps && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">How to Apply</h3>
              <p className="text-muted-foreground whitespace-pre-line">
                {application.application_steps}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ApplicationCard;
