import { useState, useEffect } from "react";
import { Bell, Settings, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferencesProps {
  applicationId?: string;
  userId: string;
}

export const NotificationPreferences = ({ applicationId, userId }: NotificationPreferencesProps) => {
  const [preferences, setPreferences] = useState({
    enabled: true,
    channels: {
      push: true,
      inApp: true,
      email: false
    },
    days_before: [7, 3, 1]
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadPreferences = async () => {
      if (!applicationId) return;

      try {
        const { data, error } = await supabase
          .from('applications')
          .select('notification_preferences')
          .eq('id', applicationId)
          .single();

        if (error) throw error;

        if (data?.notification_preferences) {
          const prefs = data.notification_preferences as any;
          const channelsArray = Array.isArray(prefs.channels) ? prefs.channels : [];
          
          setPreferences({
            enabled: prefs.enabled !== undefined ? prefs.enabled : true,
            channels: {
              push: channelsArray.includes('push') || prefs.channels?.push || true,
              inApp: channelsArray.includes('inApp') || prefs.channels?.inApp || true,
              email: channelsArray.includes('email') || prefs.channels?.email || false
            },
            days_before: Array.isArray(prefs.days_before) ? prefs.days_before : [7, 3, 1]
          });
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, [applicationId]);

  const handleSave = async () => {
    if (!applicationId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          notification_preferences: {
            enabled: preferences.enabled,
            channels: Object.keys(preferences.channels).filter(k => preferences.channels[k as keyof typeof preferences.channels]),
            days_before: preferences.days_before
          }
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Reschedule notifications with new preferences
      const { error: scheduleError } = await supabase.functions.invoke(
        'schedule-notifications',
        {
          body: { applicationId }
        }
      );

      if (scheduleError) {
        console.error('Failed to reschedule notifications:', scheduleError);
      }

      toast({
        title: "Preferences saved",
        description: "Your notification settings have been updated.",
      });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save preferences.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleReminderDay = (day: number) => {
    if (preferences.days_before.includes(day)) {
      setPreferences({
        ...preferences,
        days_before: preferences.days_before.filter(d => d !== day)
      });
    } else {
      setPreferences({
        ...preferences,
        days_before: [...preferences.days_before, day].sort((a, b) => b - a)
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Manage how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-notifications" className="text-base font-medium">
                Enable Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Master toggle for all notifications
              </p>
            </div>
            <Switch
              id="enable-notifications"
              checked={preferences.enabled}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, enabled: checked })
              }
            />
          </div>

          {preferences.enabled && (
            <>
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notification Channels
                </h4>
                
                <div className="space-y-3 pl-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="push-notifs"
                      checked={preferences.channels.push}
                      onCheckedChange={(checked) => 
                        setPreferences({
                          ...preferences,
                          channels: { ...preferences.channels, push: checked as boolean }
                        })
                      }
                    />
                    <label htmlFor="push-notifs" className="text-sm cursor-pointer">
                      Push Notifications (Browser notifications)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="inapp-notifs"
                      checked={preferences.channels.inApp}
                      onCheckedChange={(checked) => 
                        setPreferences({
                          ...preferences,
                          channels: { ...preferences.channels, inApp: checked as boolean }
                        })
                      }
                    />
                    <label htmlFor="inapp-notifs" className="text-sm cursor-pointer">
                      In-App Notifications (Notification center)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2 opacity-50">
                    <Checkbox
                      id="email-notifs"
                      checked={preferences.channels.email}
                      disabled
                    />
                    <label htmlFor="email-notifs" className="text-sm">
                      Email Notifications (Coming soon)
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Reminder Schedule
                </h4>
                <p className="text-sm text-muted-foreground">
                  Choose when to be reminded before each deadline
                </p>

                <div className="flex flex-wrap gap-2 pl-6">
                  {[14, 7, 5, 3, 2, 1].map((day) => (
                    <Button
                      key={day}
                      variant={preferences.days_before.includes(day) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleReminderDay(day)}
                    >
                      {day} {day === 1 ? 'day' : 'days'}
                    </Button>
                  ))}
                </div>

                {preferences.days_before.length === 0 && (
                  <p className="text-sm text-muted-foreground pl-6">
                    Select at least one reminder interval
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Quiet Hours (Coming Soon)
                </h4>
                <p className="text-sm text-muted-foreground pl-6">
                  Schedule when you don't want to receive notifications
                </p>
              </div>
            </>
          )}

          <Button 
            onClick={handleSave} 
            disabled={isSaving || !applicationId}
            className="w-full"
          >
            {isSaving ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
