import { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Feature Discovery Hints
 * 
 * Contextual tooltips to help users discover features
 */

interface FeatureHintProps {
  id: string;
  target: string; // CSS selector or data attribute
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  dismissible?: boolean;
  showOnce?: boolean;
  className?: string;
}

export const FeatureHint = ({
  id,
  target,
  title,
  description,
  placement = 'bottom',
  delay = 2000,
  dismissible = true,
  showOnce = true,
  className,
}: FeatureHintProps) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // Check if already dismissed
    if (showOnce) {
      const dismissed = localStorage.getItem(`feature-hint-${id}`);
      if (dismissed === 'true') return;
    }

    // Show after delay
    const timer = setTimeout(() => {
      const element = document.querySelector(target);
      if (element) {
        const rect = element.getBoundingClientRect();
        calculatePosition(rect);
        setVisible(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [id, target, delay, showOnce]);

  const calculatePosition = (rect: DOMRect) => {
    const offset = 16;

    switch (placement) {
      case 'top':
        setPosition({
          top: rect.top - offset,
          left: rect.left + rect.width / 2,
        });
        break;
      case 'bottom':
        setPosition({
          top: rect.bottom + offset,
          left: rect.left + rect.width / 2,
        });
        break;
      case 'left':
        setPosition({
          top: rect.top + rect.height / 2,
          left: rect.left - offset,
        });
        break;
      case 'right':
        setPosition({
          top: rect.top + rect.height / 2,
          left: rect.right + offset,
        });
        break;
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    if (showOnce) {
      localStorage.setItem(`feature-hint-${id}`, 'true');
    }
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed z-[9999] pointer-events-auto',
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: placement === 'left' || placement === 'right' 
          ? 'translateY(-50%)'
          : 'translateX(-50%)',
      }}
    >
      <Card className="p-4 max-w-xs shadow-lg border-2 border-primary animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="rounded-full bg-primary/10 p-2">
              <Lightbulb className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {dismissible && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

// Feature Spotlight (highlights a specific element)
interface FeatureSpotlightProps {
  target: string;
  title: string;
  description: string;
  onComplete: () => void;
}

export const FeatureSpotlight = ({
  target,
  title,
  description,
  onComplete,
}: FeatureSpotlightProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = document.querySelector(target);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [target]);

  const handleComplete = () => {
    setVisible(false);
    onComplete();
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998]" />

      {/* Spotlight */}
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        <div className="relative w-full h-full">
          {/* Tooltip */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
            <Card className="p-6 max-w-md shadow-2xl">
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{description}</p>
              <Button onClick={handleComplete} className="w-full">
                Got it!
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

// Progressive Disclosure (show advanced features gradually)
export const ProgressiveDisclosure = ({
  children,
  level,
}: {
  children: React.ReactNode;
  level: number;
}) => {
  const [userLevel, setUserLevel] = useState(0);

  useEffect(() => {
    const storedLevel = localStorage.getItem('user-experience-level');
    setUserLevel(storedLevel ? parseInt(storedLevel) : 0);
  }, []);

  if (userLevel < level) return null;

  return <>{children}</>;
};

// Hook to manage feature discovery
export const useFeatureDiscovery = () => {
  const markFeatureDiscovered = (featureId: string) => {
    localStorage.setItem(`feature-discovered-${featureId}`, 'true');
  };

  const isFeatureDiscovered = (featureId: string): boolean => {
    return localStorage.getItem(`feature-discovered-${featureId}`) === 'true';
  };

  const resetAllDiscoveries = () => {
    Object.keys(localStorage)
      .filter(key => key.startsWith('feature-discovered-') || key.startsWith('feature-hint-'))
      .forEach(key => localStorage.removeItem(key));
  };

  const incrementUserLevel = () => {
    const current = parseInt(localStorage.getItem('user-experience-level') || '0');
    localStorage.setItem('user-experience-level', (current + 1).toString());
  };

  return {
    markFeatureDiscovered,
    isFeatureDiscovered,
    resetAllDiscoveries,
    incrementUserLevel,
  };
};

export default FeatureHint;
