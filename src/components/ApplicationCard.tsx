import { Calendar, FileText, DollarSign, ClipboardList, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ApplicationData {
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
          {application.url && (
            <Button variant="outline" size="sm" asChild>
              <a href={application.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Official Page
              </a>
            </Button>
          )}
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
