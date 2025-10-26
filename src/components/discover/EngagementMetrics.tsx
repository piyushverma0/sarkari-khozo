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
  const isNew = hoursOld < 48; // Extended to 48 hours
  
  // More realistic engagement thresholds
  const isHighEngagement = story.view_count >= 1000; // Lowered from 10K
  const isMediumEngagement = story.view_count >= 100 && story.view_count < 1000; // Lowered from 1K-10K
  const isLowEngagement = story.view_count >= 10 && story.view_count < 100;
  const isVeryLowEngagement = story.view_count < 10;
  
  // Calculate save rate for popularity badge
  const saveRate = story.view_count > 0 
    ? (story.save_count / story.view_count) * 100 
    : 0;
  const isPopular = saveRate > 10 && story.save_count >= 20; // Lowered threshold
  
  // Show "Just Posted" for very new stories with almost no views
  if (isVeryLowEngagement && isNew) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
          <Sparkles className="w-3 h-3 mr-1" />
          Just Posted
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
  
  // Time-based context for view label
  const viewsLabel = story.views_today && story.views_today > 0 && hoursOld < 48
    ? `${formatViewCount(story.views_today)} today`
    : isVeryLowEngagement
    ? `Viewed by few`
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
        
        {isPopular && (isMediumEngagement || isLowEngagement) && (
          <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
            ⭐ Popular
          </Badge>
        )}
        
        {isNew && !isVeryLowEngagement && (
          <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
            <Sparkles className="w-3 h-3 mr-1" />
            New
          </Badge>
        )}
      </div>
    </div>
  );
};
