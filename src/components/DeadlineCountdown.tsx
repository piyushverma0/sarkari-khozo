import { useEffect, useState } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { differenceInDays, differenceInHours, differenceInMinutes, parseISO } from "date-fns";

interface DeadlineCountdownProps {
  importantDates: any;
  reminders: any[];
}

const DeadlineCountdown = ({ importantDates, reminders }: DeadlineCountdownProps) => {
  const [countdown, setCountdown] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!importantDates) return;

    // Find the closest deadline
    let closestDeadline: Date | null = null;
    let deadlineLabel = "";

    Object.entries(importantDates).forEach(([key, value]) => {
      if (typeof value === 'string' && (
        key.toLowerCase().includes('deadline') ||
        key.toLowerCase().includes('last_date') ||
        key.toLowerCase().includes('closing')
      )) {
        try {
          // Try to parse the date
          const dateStr = value as string;
          // Try different date formats
          let date: Date | null = null;
          
          // Try ISO format first
          if (dateStr.includes('-')) {
            date = parseISO(dateStr);
          } else {
            // Try parsing DD/MM/YYYY or other formats
            date = new Date(dateStr);
          }

          if (date && !isNaN(date.getTime())) {
            if (!closestDeadline || date < closestDeadline) {
              closestDeadline = date;
              deadlineLabel = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
          }
        } catch (e) {
          console.error('Error parsing date:', e);
        }
      }
    });

    if (!closestDeadline) return;

    const updateCountdown = () => {
      const now = new Date();
      const days = differenceInDays(closestDeadline!, now);
      const hours = differenceInHours(closestDeadline!, now) % 24;
      const minutes = differenceInMinutes(closestDeadline!, now) % 60;

      setIsUrgent(days <= 7);

      if (days < 0) {
        setCountdown("Deadline has passed");
      } else if (days === 0) {
        setCountdown(`Today! ${hours}h ${minutes}m remaining`);
      } else if (days === 1) {
        setCountdown(`Tomorrow! ${hours}h ${minutes}m remaining`);
      } else if (days <= 30) {
        setCountdown(`${days} days, ${hours}h remaining`);
      } else {
        setCountdown(`${days} days remaining`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [importantDates]);

  if (!countdown) return null;

  return (
    <div className={`p-4 rounded-lg border ${
      isUrgent 
        ? 'bg-destructive/10 border-destructive/50' 
        : 'bg-primary/10 border-primary/50'
    }`}>
      <div className="flex items-center gap-3">
        {isUrgent ? (
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
        ) : (
          <Clock className="w-5 h-5 text-primary flex-shrink-0" />
        )}
        <div>
          <p className={`font-semibold ${isUrgent ? 'text-destructive' : 'text-primary'}`}>
            {countdown}
          </p>
          {isUrgent && (
            <p className="text-sm text-muted-foreground mt-1">
              ⚠️ Application deadline is approaching soon!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeadlineCountdown;
