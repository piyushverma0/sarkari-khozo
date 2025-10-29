import { useState, useEffect } from 'react';
import { Bell, Clock, Mail, Smartphone, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  // Channels
  push_enabled: boolean;
  email_enabled: boolean;
  
  // Categories
  deadline_reminders: boolean;
  new_schemes: boolean;
  result_updates: boolean;
  application_status: boolean;
  personalized_recommendations: boolean;
  
  // Timing preferences
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  
  // Grouping & batching
  batch_notifications: boolean;
  batch_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  
  // Priority filtering
  only_high_priority: boolean;
  
  // Specific timing for different types
  deadline_reminder_days: number[];
}

interface EnhancedNotificationPreferencesProps {
  userId: string;
}

export const EnhancedNotificationPreferences = ({ userId }: EnhancedNotificationPreferencesProps) => {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_enabled: true,
    email_enabled: false,
    deadline_reminders: true,
    new_schemes: true,
    result_updates: true,
    application_status: true,
    personalized_recommendations: false,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    batch_notifications: false,
    batch_frequency: 'immediate',
    only_high_priority: false,
    deadline_reminder_days: [7, 3, 1],
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data.preferences as NotificationPreferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Preferences Saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const toggleDeadlineDay = (day: number) => {
    setPreferences(prev => {
      const days = prev.deadline_reminder_days.includes(day)
        ? prev.deadline_reminder_days.filter(d => d !== day)
        : [...prev.deadline_reminder_days, day].sort((a, b) => b - a);
      return { ...prev, deadline_reminder_days: days };
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading preferences...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label htmlFor="push-enabled" className="font-medium">
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Instant alerts on your device
                </p>
              </div>
            </div>
            <Switch
              id="push-enabled"
              checked={preferences.push_enabled}
              onCheckedChange={(checked) => updatePreference('push_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email-enabled" className="font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Fallback when push is unavailable
                </p>
              </div>
            </div>
            <Switch
              id="email-enabled"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => updatePreference('email_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Select which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="deadline-reminders" className="font-medium">
                Deadline Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Get reminded before application deadlines
              </p>
            </div>
            <Switch
              id="deadline-reminders"
              checked={preferences.deadline_reminders}
              onCheckedChange={(checked) => updatePreference('deadline_reminders', checked)}
            />
          </div>

          {preferences.deadline_reminders && (
            <div className="ml-6 p-4 bg-muted rounded-lg space-y-2">
              <Label className="text-sm font-medium">Remind me before:</Label>
              <div className="flex flex-wrap gap-2">
                {[14, 7, 3, 1].map((day) => (
                  <Badge
                    key={day}
                    variant={preferences.deadline_reminder_days.includes(day) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleDeadlineDay(day)}
                  >
                    {day === 1 ? '1 day' : `${day} days`}
                    {preferences.deadline_reminder_days.includes(day) && (
                      <Check className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="new-schemes" className="font-medium">
                New Schemes & Exams
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified about new opportunities
              </p>
            </div>
            <Switch
              id="new-schemes"
              checked={preferences.new_schemes}
              onCheckedChange={(checked) => updatePreference('new_schemes', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="result-updates" className="font-medium">
                Result Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Exam results and announcements
              </p>
            </div>
            <Switch
              id="result-updates"
              checked={preferences.result_updates}
              onCheckedChange={(checked) => updatePreference('result_updates', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="application-status" className="font-medium">
                Application Status
              </Label>
              <p className="text-sm text-muted-foreground">
                Updates on your submitted applications
              </p>
            </div>
            <Switch
              id="application-status"
              checked={preferences.application_status}
              onCheckedChange={(checked) => updatePreference('application_status', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="personalized-recommendations" className="font-medium">
                Personalized Recommendations
              </Label>
              <p className="text-sm text-muted-foreground">
                Schemes matching your profile
              </p>
            </div>
            <Switch
              id="personalized-recommendations"
              checked={preferences.personalized_recommendations}
              onCheckedChange={(checked) => updatePreference('personalized_recommendations', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Smart Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Smart Timing
          </CardTitle>
          <CardDescription>
            Control when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="quiet-hours" className="font-medium">
                Quiet Hours
              </Label>
              <p className="text-sm text-muted-foreground">
                Don't disturb during these hours
              </p>
            </div>
            <Switch
              id="quiet-hours"
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={(checked) => updatePreference('quiet_hours_enabled', checked)}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="ml-6 grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label htmlFor="quiet-start" className="text-sm">
                  Start Time
                </Label>
                <Select
                  value={preferences.quiet_hours_start}
                  onValueChange={(value) => updatePreference('quiet_hours_start', value)}
                >
                  <SelectTrigger id="quiet-start">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quiet-end" className="text-sm">
                  End Time
                </Label>
                <Select
                  value={preferences.quiet_hours_end}
                  onValueChange={(value) => updatePreference('quiet_hours_end', value)}
                >
                  <SelectTrigger id="quiet-end">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="batch-notifications" className="font-medium">
                Batch Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Group multiple notifications together
              </p>
            </div>
            <Switch
              id="batch-notifications"
              checked={preferences.batch_notifications}
              onCheckedChange={(checked) => updatePreference('batch_notifications', checked)}
            />
          </div>

          {preferences.batch_notifications && (
            <div className="ml-6 p-4 bg-muted rounded-lg">
              <Label htmlFor="batch-frequency" className="text-sm">
                Batch Frequency
              </Label>
              <Select
                value={preferences.batch_frequency}
                onValueChange={(value: any) => updatePreference('batch_frequency', value)}
              >
                <SelectTrigger id="batch-frequency" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate (No batching)</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily Digest (9 AM)</SelectItem>
                  <SelectItem value="weekly">Weekly Summary (Monday 9 AM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="only-high-priority" className="font-medium">
                High Priority Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Only urgent and important notifications
              </p>
            </div>
            <Switch
              id="only-high-priority"
              checked={preferences.only_high_priority}
              onCheckedChange={(checked) => updatePreference('only_high_priority', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadPreferences} disabled={saving}>
          Reset
        </Button>
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};

export default EnhancedNotificationPreferences;
