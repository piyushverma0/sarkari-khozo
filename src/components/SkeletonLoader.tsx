import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const ApplicationCardSkeleton = () => (
  <Card className="w-full">
    <CardHeader>
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-20 w-full mt-4" />
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </CardContent>
  </Card>
);

export const SchemeCardSkeleton = () => (
  <Card className="w-full">
    <CardHeader>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full mt-2" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-10 w-full" />
    </CardContent>
  </Card>
);

export const SavedApplicationSkeleton = () => (
  <div className="glass-card rounded-xl p-6">
    <div className="space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);
