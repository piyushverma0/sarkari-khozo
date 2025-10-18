import { useState } from "react";
import { Bell, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, subDays } from "date-fns";

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importantDates: Record<string, string>;
  applicationTitle: string;
}

const ReminderDialog = ({ open, onOpenChange, importantDates, applicationTitle }: ReminderDialogProps) => {
  const [reminders, setReminders] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleSetReminders = () => {
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          scheduleReminders();
        } else {
          toast({
            variant: "destructive",
            title: "Notification Permission Denied",
            description: "Please enable notifications to receive reminders.",
          });
        }
      });
    } else if (Notification.permission === "granted") {
      scheduleReminders();
    } else {
      toast({
        variant: "destructive",
        title: "Notifications Not Supported",
        description: "Your browser doesn't support notifications.",
      });
    }
  };

  const scheduleReminders = () => {
    const selectedDates = Object.entries(reminders)
      .filter(([_, enabled]) => enabled)
      .map(([dateKey]) => dateKey);

    if (selectedDates.length === 0) {
      toast({
        variant: "destructive",
        title: "No Dates Selected",
        description: "Please select at least one date to set reminders.",
      });
      return;
    }

    // Store reminders in localStorage for now
    const existingReminders = JSON.parse(localStorage.getItem("applicationReminders") || "[]");
    
    selectedDates.forEach((dateKey) => {
      const dateStr = importantDates[dateKey];
      try {
        // Try to parse the date
        const targetDate = parseISO(dateStr);
        
        // Set reminders for 7, 3, and 1 day before
        [7, 3, 1].forEach((daysBefore) => {
          const reminderDate = subDays(targetDate, daysBefore);
          
          if (reminderDate > new Date()) {
            existingReminders.push({
              applicationTitle,
              dateKey,
              dateStr,
              reminderDate: reminderDate.toISOString(),
              daysBefore,
            });
          }
        });
      } catch (error) {
        console.error("Error parsing date:", dateStr, error);
      }
    });

    localStorage.setItem("applicationReminders", JSON.stringify(existingReminders));

    toast({
      title: "Reminders Set! 🔔",
      description: `You'll be notified 7, 3, and 1 day before the selected dates.`,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Set Reminders
          </DialogTitle>
          <DialogDescription>
            Select the dates you want to be reminded about. You'll receive notifications 7, 3, and 1 day before each date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {Object.entries(importantDates).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No important dates available for this application.</p>
            </div>
          ) : (
            Object.entries(importantDates).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted">
                <div className="flex-1">
                  <Label htmlFor={key} className="text-base font-medium capitalize cursor-pointer">
                    {key.replace(/_/g, ' ').replace(/date/i, '').trim()}
                  </Label>
                  <p className="text-sm text-muted-foreground">{value}</p>
                </div>
                <Switch
                  id={key}
                  checked={reminders[key] || false}
                  onCheckedChange={(checked) => 
                    setReminders({ ...reminders, [key]: checked })
                  }
                />
              </div>
            ))
          )}
        </div>

        {Object.entries(importantDates).length > 0 && (
          <div className="space-y-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Browser Notifications</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Make sure to enable notifications when prompted. We'll remind you at 7, 3, and 1 day before each selected date.
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={handleSetReminders} className="w-full" size="lg">
              <Bell className="w-4 h-4 mr-2" />
              Set Reminders
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReminderDialog;
