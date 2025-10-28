import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Clock, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { recommendationEngine, RecommendationItem } from '@/lib/recommendationEngine';
import { shareService, ShareData } from '@/lib/shareService';
import { viewingHistory } from '@/lib/viewingHistory';
import { useToast } from '@/hooks/use-toast';
import { ShareDialog } from './ShareDialog';
import { LiveDeadlineCountdown } from '@/components/LiveDeadlineCountdown';

interface PersonalizedFeedProps {
  userId: string;
  limit?: number;
  showReason?: boolean;
}

export const PersonalizedFeed = ({
  userId,
  limit = 20,
  showReason = true,
}: PersonalizedFeedProps) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RecommendationItem | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
  }, [userId]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const items = await recommendationEngine.getPersonalizedRecommendations({
        userId,
        limit,
        excludeApplied: true,
        diversify: true,
      });

      setRecommendations(items);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load recommendations',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = async (item: RecommendationItem) => {
    // Track view
    await viewingHistory.trackView(
      userId,
      item.id,
      item.type,
      item.title,
      item.category,
      'recommendation'
    );

    // Navigate to item
    window.location.href = `/application/${item.id}`;
  };

  const handleShare = (item: RecommendationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    setShareDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No recommendations yet</p>
          <p className="text-sm text-muted-foreground">
            Browse some schemes to get personalized recommendations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold">Recommended For You</h2>
      </div>

      {recommendations.map((item, index) => (
        <Card
          key={item.id}
          className="hover:shadow-lg transition-shadow cursor-pointer group"
          onClick={() => handleItemClick(item)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {item.title}
                  </CardTitle>
                  {index < 3 && (
                    <Badge variant="default" className="gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Top Pick
                    </Badge>
                  )}
                </div>
                
                {showReason && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.reason}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{item.category}</Badge>
                  <Badge variant="secondary">{item.type}</Badge>
                  {item.tags?.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleShare(item, e)}
                className="ml-2"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {item.deadline && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Deadline:</span>
                <LiveDeadlineCountdown
                  deadline={item.deadline}
                  showIcon={false}
                  className="text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Share Dialog */}
      {selectedItem && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          data={{
            title: selectedItem.title,
            text: shareService.generateShareText(
              selectedItem.title,
              selectedItem.type,
              selectedItem.deadline
            ),
            url: shareService.generateShareLink(selectedItem.id, selectedItem.type),
            type: selectedItem.type,
            category: selectedItem.category,
          }}
        />
      )}
    </div>
  );
};

export default PersonalizedFeed;
