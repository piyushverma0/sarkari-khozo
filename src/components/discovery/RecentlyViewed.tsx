import { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { viewingHistory, RecentlyViewedItem } from '@/lib/viewingHistory';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RecentlyViewedProps {
  userId: string;
  limit?: number;
  horizontal?: boolean;
}

export const RecentlyViewed = ({
  userId,
  limit = 10,
  horizontal = true,
}: RecentlyViewedProps) => {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRecentlyViewed();
  }, [userId]);

  const loadRecentlyViewed = async () => {
    setLoading(true);
    try {
      const viewed = await viewingHistory.getRecentlyViewed(userId, limit);
      setItems(viewed);
    } catch (error) {
      console.error('Error loading recently viewed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: RecentlyViewedItem) => {
    window.location.href = `/application/${item.id}`;
  };

  const handleClearHistory = async () => {
    try {
      await viewingHistory.clearHistory(userId);
      setItems([]);
      setClearDialogOpen(false);
      toast({
        title: 'History cleared',
        description: 'Your viewing history has been cleared',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear history',
      });
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className={horizontal ? 'flex gap-4 overflow-hidden' : 'space-y-4'}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className={horizontal ? 'h-32 w-64 flex-shrink-0' : 'h-24 w-full'} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Recently Viewed</h3>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setClearDialogOpen(true)}
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>

      {horizontal ? (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {items.map((item) => (
              <Card
                key={item.id}
                className="w-64 flex-shrink-0 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm line-clamp-2">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {item.type}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground">
                      {formatTime(item.viewedAt)}
                    </span>
                  </div>
                  {item.timeSpent && item.timeSpent > 30 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Spent {Math.floor(item.timeSpent / 60)}m reading
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card
              key={item.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleItemClick(item)}
            >
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1 mb-1">{item.title}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                    {formatTime(item.viewedAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Clear History Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear viewing history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your viewing history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory}>
              Clear History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return <div className="space-y-4">{content}</div>;
};

export default RecentlyViewed;
