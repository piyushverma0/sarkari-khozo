import { useState, useEffect } from "react";
import { Bell, Check, Calendar, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface ApplicationConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: {
    id: string;
    title: string;
    important_dates?: any;
    notification_preferences?: any;
  };
  onConfirm?: () => void;
}

export const ApplicationConfirmationDialog = ({
  open,
  onOpenChange,
  application,
  onConfirm
}: ApplicationConfirmationDialogProps) => {
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [channels, setChannels] = useState({
    push: true,
    inApp: true,
    email: false
  });
  const [reminderDays, setReminderDays] = useState([7, 3, 1]);
  const [customDays, setCustomDays] = useState<number[]>([]);

  const importantDates = application.important_dates || {};
  const datesCount = Object.keys(importantDates).length;

  const toggleReminderDay = (day: number) => {
    if (reminderDays.includes(day)) {
      setReminderDays(reminderDays.filter(d => d !== day));
    } else {
      setReminderDays([...reminderDays, day].sort((a, b) => b - a));
    }
  };

  const handleConfirm = async () => {
    if (step === 1 && confirmed) {
      setStep(2);
      return;
    }

    if (step === 2) {
      setIsLoading(true);
      try {
        // Update application with confirmation and preferences
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            applied_confirmed: true,
            application_status: 'applied',
            notification_preferences: {
              enabled: notificationsEnabled,
              channels: Object.keys(channels).filter(k => channels[k as keyof typeof channels]),
              days_before: reminderDays
            }
          })
          .eq('id', application.id);

        if (updateError) throw updateError;

        // Schedule notifications
        if (notificationsEnabled) {
          const { error: scheduleError } = await supabase.functions.invoke(
            'schedule-notifications',
            {
              body: { applicationId: application.id }
            }
          );

          if (scheduleError) {
            console.error('Failed to schedule notifications:', scheduleError);
            toast({
              title: "Application confirmed",
              description: "But failed to schedule reminders. You can set them up later.",
              variant: "default"
            });
          } else {
            toast({
              title: "Success!",
              description: `Application confirmed and ${reminderDays.length * datesCount} reminders scheduled.`,
            });
          }
        } else {
          toast({
            title: "Application confirmed",
            description: "Your application has been tracked successfully.",
          });
        }

        onConfirm?.();
        onOpenChange(false);
      } catch (error: any) {
        console.error('Error confirming application:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to confirm application. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  const formatDateKey = (key: string) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 1 ? (
              <>
                <Check className="h-5 w-5 text-primary" />
                Confirm Application
              </>
            ) : (
              <>
                <Bell className="h-5 w-5 text-primary" />
                Set Up Reminders
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Track this application to get automated updates and reminders"
              : "Customize when and how you want to receive notifications"
            }
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="glass-card p-6 rounded-lg border-primary/20">
              <h3 className="text-lg font-semibold mb-4">Have you applied to this program?</h3>
              
              <div className="space-y-4">
                <button
                  onClick={() => setConfirmed(true)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    confirmed 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      confirmed ? 'border-primary bg-primary' : 'border-border'
                    }`}>
                      {confirmed && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium">Yes, I have applied</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get automated tracking, reminders, and status updates
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setConfirmed(false)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    !confirmed 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      !confirmed ? 'border-primary bg-primary' : 'border-border'
                    }`}>
                      {!confirmed && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium">Not yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Just browsing for now
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {confirmed && (
                <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    Benefits of confirmation:
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Automated deadline reminders</li>
                    <li>• Status change notifications</li>
                    <li>• Important date updates</li>
                    <li>• Document preparation alerts</li>
                  </ul>
                </div>
              )}
            </div>

            {datesCount > 0 && (
              <div className="glass-card p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Important Dates ({datesCount})
                </h3>
                <div className="space-y-2">
                  {Object.entries(importantDates).slice(0, 5).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <span className="font-medium">{formatDateKey(key)}</span>
                      <Badge variant="outline">{value as string}</Badge>
                    </div>
                  ))}
                  {datesCount > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      +{datesCount - 5} more dates
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 glass-card rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="notifications-toggle" className="text-base font-medium">
                  Enable Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive reminders and updates
                </p>
              </div>
              <Switch
                id="notifications-toggle"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>

            {notificationsEnabled && (
              <>
                <div className="glass-card p-6 rounded-lg space-y-4">
                  <h3 className="font-semibold">Notification Channels</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="push"
                        checked={channels.push}
                        onCheckedChange={(checked) => 
                          setChannels({ ...channels, push: checked as boolean })
                        }
                      />
                      <label htmlFor="push" className="flex items-center gap-2 cursor-pointer">
                        <Bell className="h-4 w-4" />
                        <span>Push Notifications</span>
                        <Badge variant="secondary" className="text-xs">Recommended</Badge>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="inApp"
                        checked={channels.inApp}
                        onCheckedChange={(checked) => 
                          setChannels({ ...channels, inApp: checked as boolean })
                        }
                      />
                      <label htmlFor="inApp" className="flex items-center gap-2 cursor-pointer">
                        <span>📱 In-App Alerts</span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2 opacity-50">
                      <Checkbox
                        id="email"
                        checked={channels.email}
                        disabled
                        onCheckedChange={(checked) => 
                          setChannels({ ...channels, email: checked as boolean })
                        }
                      />
                      <label htmlFor="email" className="flex items-center gap-2">
                        <span>📧 Email</span>
                        <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-lg space-y-4">
                  <h3 className="font-semibold">Reminder Schedule</h3>
                  <p className="text-sm text-muted-foreground">
                    Get notified before each important date
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {[14, 7, 5, 3, 2, 1].map((day) => (
                      <Button
                        key={day}
                        variant={reminderDays.includes(day) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleReminderDay(day)}
                      >
                        {day} {day === 1 ? 'day' : 'days'} before
                      </Button>
                    ))}
                  </div>

                  {reminderDays.length > 0 && datesCount > 0 && (
                    <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">
                          {reminderDays.length * datesCount} notifications
                        </span>
                        {' '}will be scheduled ({reminderDays.length} reminders for each of {datesCount} dates)
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleSkip}>
            {step === 1 ? "Skip" : "Cancel"}
          </Button>
          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
            )}
            <Button 
              onClick={handleConfirm} 
              disabled={isLoading || (step === 1 && !confirmed && confirmed !== false)}
            >
              {isLoading ? "Confirming..." : step === 1 ? "Continue" : "Confirm & Schedule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
