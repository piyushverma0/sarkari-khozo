import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Comprehensive Skeleton Screens for Better Perceived Performance
 */

// Application Card Skeleton
export const ApplicationCardSkeleton = () => (
  <Card className="w-full">
    <CardHeader>
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// List of Application Cards
export const ApplicationListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <ApplicationCardSkeleton key={i} />
    ))}
  </div>
);

// Search Results Skeleton
export const SearchResultsSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>
    {Array.from({ length: 5 }).map((_, i) => (
      <Card key={i} className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      </Card>
    ))}
  </div>
);

// Dashboard Stats Skeleton
export const DashboardStatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="py-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Profile Skeleton
export const ProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-24 w-24 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  </div>
);

// Table Skeleton
export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-3">
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-12 w-full" />
        ))}
      </div>
    ))}
  </div>
);

// Form Skeleton
export const FormSkeleton = ({ fields = 5 }: { fields?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <div className="flex gap-2 pt-4">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
);

// Notification List Skeleton
export const NotificationListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

// Category Grid Skeleton
export const CategoryGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </Card>
    ))}
  </div>
);

// Detail Page Skeleton
export const DetailPageSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="space-y-4">
      <Skeleton className="h-8 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-6 w-12" />
        </Card>
      ))}
    </div>

    {/* Content */}
    <Card className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="pt-4">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </Card>

    {/* Related Items */}
    <div className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <ApplicationCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

// Feed Skeleton (for Discovery/Personalized Feed)
export const FeedSkeleton = ({ count = 10 }: { count?: number }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 mb-4">
      <Skeleton className="h-6 w-6 rounded-full" />
      <Skeleton className="h-6 w-48" />
    </div>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
      </Card>
    ))}
  </div>
);

// Chat/Messages Skeleton
export const ChatSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => {
      const isUser = i % 2 === 0;
      return (
        <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[70%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
            <Skeleton className="h-16 w-48 rounded-2xl" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      );
    })}
  </div>
);

// Timeline Skeleton
export const TimelineSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-8">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex gap-4">
        <div className="flex flex-col items-center">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          {i < count - 1 && <div className="w-0.5 h-full bg-muted mt-2" />}
        </div>
        <div className="flex-1 space-y-2 pb-8">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-32 mt-2" />
        </div>
      </div>
    ))}
  </div>
);

// Calendar/Event Skeleton
export const CalendarEventsSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="p-3">
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </Card>
    ))}
  </div>
);

// Generic Content Skeleton with Shimmer Effect
export const ContentSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-4 bg-muted rounded w-3/4"></div>
    <div className="h-4 bg-muted rounded w-full"></div>
    <div className="h-4 bg-muted rounded w-5/6"></div>
    <div className="h-4 bg-muted rounded w-2/3"></div>
  </div>
);
