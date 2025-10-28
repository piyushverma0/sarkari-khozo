import { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LiveDeadlineCountdownProps {
  deadline: string; // ISO date string
  title?: string;
  showIcon?: boolean;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export const LiveDeadlineCountdown = ({
  deadline,
  title,
  showIcon = true,
  className,
}: LiveDeadlineCountdownProps) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const difference = deadlineTime - now;

      if (difference <= 0) {
        setIsExpired(true);
        return null;
      }

      return {
        total: difference,
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    // Initial calculation
    const initial = calculateTimeRemaining();
    if (initial) {
      setTimeRemaining(initial);
    }

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      if (remaining) {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (isExpired) {
    return (
      <div className={cn('flex items-center gap-2 text-destructive', className)}>
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium">Deadline Expired</span>
      </div>
    );
  }

  if (!timeRemaining) {
    return null;
  }

  const getUrgencyColor = () => {
    if (timeRemaining.days <= 1) return 'destructive';
    if (timeRemaining.days <= 3) return 'default';
    return 'secondary';
  };

  const formatTime = () => {
    const parts = [];

    if (timeRemaining.days > 0) {
      parts.push(`${timeRemaining.days}d`);
    }
    if (timeRemaining.hours > 0 || timeRemaining.days > 0) {
      parts.push(`${timeRemaining.hours}h`);
    }
    if (timeRemaining.days === 0) {
      parts.push(`${timeRemaining.minutes}m`);
      if (timeRemaining.hours === 0) {
        parts.push(`${timeRemaining.seconds}s`);
      }
    }

    return parts.join(' ');
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showIcon && <Clock className="w-4 h-4" />}
      {title && <span className="text-sm text-muted-foreground">{title}:</span>}
      <Badge variant={getUrgencyColor()} className="font-mono">
        {formatTime()}
      </Badge>
    </div>
  );
};

export default LiveDeadlineCountdown;
