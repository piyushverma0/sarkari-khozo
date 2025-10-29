import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Empty State Components with Helpful CTAs
 * 
 * Provides guidance when no data is available
 */

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  illustration?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  illustration,
  className,
}: EmptyStateProps) => {
  return (
    <Card className={cn('p-12 text-center', className)}>
      <div className="flex flex-col items-center space-y-4">
        {illustration || (
          <div className="rounded-full bg-muted p-6">
            <Icon className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground max-w-md">{description}</p>
        </div>

        {(action || secondaryAction) && (
          <div className="flex gap-2 pt-4">
            {action && (
              <Button onClick={action.onClick} size="lg">
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button onClick={secondaryAction.onClick} variant="outline" size="lg">
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

// Predefined Empty States
export const EmptySearchResults = ({ onClearFilters }: { onClearFilters?: () => void }) => (
  <EmptyState
    icon={require('lucide-react').Search}
    title="No results found"
    description="Try adjusting your search terms or filters to find what you're looking for."
    action={
      onClearFilters
        ? {
            label: 'Clear Filters',
            onClick: onClearFilters,
          }
        : undefined
    }
  />
);

export const EmptyApplicationsList = ({
  onBrowseSchemes,
}: {
  onBrowseSchemes: () => void;
}) => (
  <EmptyState
    icon={require('lucide-react').FileText}
    title="No applications yet"
    description="Start exploring government schemes, exams, and jobs to track your applications here."
    action={{
      label: 'Browse Opportunities',
      onClick: onBrowseSchemes,
    }}
  />
);

export const EmptySavedItems = ({ onDiscover }: { onDiscover: () => void }) => (
  <EmptyState
    icon={require('lucide-react').Bookmark}
    title="No saved items"
    description="Save schemes and exams you're interested in for quick access later."
    action={{
      label: 'Discover Now',
      onClick: onDiscover,
    }}
  />
);

export const EmptyNotifications = () => (
  <EmptyState
    icon={require('lucide-react').Bell}
    title="No notifications"
    description="You're all caught up! We'll notify you about deadlines, results, and new opportunities."
  />
);

export const EmptyRecentlyViewed = ({ onBrowse }: { onBrowse: () => void }) => (
  <EmptyState
    icon={require('lucide-react').Clock}
    title="No viewing history"
    description="Items you view will appear here for quick access."
    action={{
      label: 'Start Browsing',
      onClick: onBrowse,
    }}
  />
);

export const EmptyRelatedItems = () => (
  <EmptyState
    icon={require('lucide-react').Link2}
    title="No related items"
    description="We couldn't find similar schemes or exams at this time."
  />
);

export const NoInternetConnection = ({ onRetry }: { onRetry: () => void }) => (
  <EmptyState
    icon={require('lucide-react').WifiOff}
    title="No internet connection"
    description="Please check your connection and try again."
    action={{
      label: 'Retry',
      onClick: onRetry,
    }}
  />
);

export const ErrorState = ({
  title = 'Something went wrong',
  description = 'An error occurred while loading this content.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) => (
  <EmptyState
    icon={require('lucide-react').AlertCircle}
    title={title}
    description={description}
    action={
      onRetry
        ? {
            label: 'Try Again',
            onClick: onRetry,
          }
        : undefined
    }
  />
);

export const MaintenanceMode = () => (
  <EmptyState
    icon={require('lucide-react').Wrench}
    title="Under Maintenance"
    description="We're currently performing maintenance. Please check back soon."
  />
);

export const ComingSoon = ({
  feature,
  onNotifyMe,
}: {
  feature: string;
  onNotifyMe?: () => void;
}) => (
  <EmptyState
    icon={require('lucide-react').Sparkles}
    title={`${feature} Coming Soon`}
    description="We're working hard to bring you this feature. Stay tuned!"
    action={
      onNotifyMe
        ? {
            label: 'Notify Me',
            onClick: onNotifyMe,
          }
        : undefined
    }
  />
);

// Inline Empty State (smaller, for inside cards)
interface InlineEmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const InlineEmptyState = ({ icon: Icon, message, action }: InlineEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="w-8 h-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {action && (
        <Button onClick={action.onClick} size="sm" variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
