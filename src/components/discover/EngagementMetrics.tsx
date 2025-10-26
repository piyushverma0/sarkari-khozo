import { Badge } from '@/components/ui/badge';
import { Eye, Bookmark, TrendingUp, Sparkles } from 'lucide-react';
import { DiscoveryStory } from '@/types/discovery';
import { formatViewCount } from '@/utils/formatViewCount';
import { formatDistanceToNow } from 'date-fns';

interface EngagementMetricsProps {
  story: DiscoveryStory;
  placement?: 'inline' | 'below-key-points';
  showRelative?: boolean;
  className?: string;
}

export const EngagementMetrics = ({ 
  story, 
  placement = 'below-key-points',
  showRelative = false,
  className = ''
}: EngagementMetricsProps) => {
  const publishedDate = new Date(story.published_date);
  const hoursOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
  const isNew = hoursOld < 24;
  
  // Smart display logic based on view count
  const shouldShowViews = story.view_count >= 1000;
  const isHighEngagement = story.view_count >= 10000;
  const isMediumEngagement = story.view_count >= 1000 && story.view_count < 10000;
  
  // Calculate save rate for popularity badge
  const saveRate = story.view_count > 0 
    ? (story.save_count / story.view_count) * 100 
    : 0;
  const isPopular = saveRate > 10 && story.save_count >= 50;
  
  // Determine if we should show "New" badge instead of views
  if (!shouldShowViews && isNew) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
          <Sparkles className="w-3 h-3 mr-1" />
          New
        </Badge>
        {story.save_count > 0 && (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Bookmark className="w-3.5 h-3.5" />
            {formatViewCount(story.save_count)} saved
          </span>
        )}
      </div>
    );
  }
  
  // Don't show anything for low engagement, non-new stories
  if (!shouldShowViews && !isNew) {
    return null;
  }
  
  // Time-based context
  const viewsLabel = story.views_today && story.views_today > 0 && hoursOld < 48
    ? `${formatViewCount(story.views_today)} today`
    : `${formatViewCount(story.view_count)} views`;
  
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Main engagement metrics */}
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 text-foreground font-medium">
          <Eye className="w-4 h-4 text-primary" />
          {viewsLabel}
        </span>
        
        {story.save_count > 0 && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Bookmark className="w-4 h-4" />
              {formatViewCount(story.save_count)} saved
            </span>
          </>
        )}
      </div>
      
      {/* Status badges */}
      <div className="flex items-center gap-2">
        {isHighEngagement && (
          <Badge variant="default" className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20">
            <TrendingUp className="w-3 h-3 mr-1" />
            Trending
          </Badge>
        )}
        
        {isPopular && isMediumEngagement && (
          <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
            ⭐ Popular
          </Badge>
        )}
        
        {showRelative && story.engagement_score && story.engagement_score > 1000 && (
          <span className="text-xs text-muted-foreground">
            High engagement
          </span>
        )}
      </div>
    </div>
  );
};
