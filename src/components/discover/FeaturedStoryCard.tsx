import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DiscoveryStory } from '@/types/discovery';
import { 
  Bookmark, 
  Share2, 
  ExternalLink, 
  Clock,
  GraduationCap,
  Briefcase,
  Building2,
  FileText,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EngagementMetrics } from './EngagementMetrics';
import { useViewTracking } from '@/hooks/useViewTracking';
import { useState } from 'react';

interface FeaturedStoryCardProps {
  story: DiscoveryStory;
  onSave: () => void;
  onShare: () => void;
  onView: () => void;
  isSaved: boolean;
}

export const FeaturedStoryCard = ({
  story,
  onSave,
  onShare,
  onView,
  isSaved
}: FeaturedStoryCardProps) => {
  const [showFullSummary, setShowFullSummary] = useState(false);
  const { handleMouseEnter, handleMouseLeave, trackClick } = useViewTracking({ storyId: story.id });

  const timeAgo = formatDistanceToNow(new Date(story.published_date), { addSuffix: true });
  const publishedDate = new Date(story.published_date);
  const hoursOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
  const isRecent = hoursOld < 24;

  // Category configuration
  const categoryConfig: Record<string, { icon: any; gradient: string; label: string }> = {
    'Exams': { 
      icon: GraduationCap, 
      gradient: 'from-purple-500/10 to-purple-600/10',
      label: 'Exams'
    },
    'Jobs': { 
      icon: Briefcase, 
      gradient: 'from-blue-500/10 to-blue-600/10',
      label: 'Jobs'
    },
    'Schemes': { 
      icon: Building2, 
      gradient: 'from-green-500/10 to-green-600/10',
      label: 'Schemes'
    },
    'Policies': { 
      icon: FileText, 
      gradient: 'from-orange-500/10 to-orange-600/10',
      label: 'Policies'
    },
  };

  const config = categoryConfig[story.category] || { 
    icon: TrendingUp, 
    gradient: 'from-primary/10 to-primary/20',
    label: story.category 
  };

  const CategoryIcon = config.icon;

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 group"
      onClick={onView}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Gradient Header */}
      <div className={`bg-gradient-to-r ${config.gradient} p-6 border-b`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Category Badge with Icon */}
            <div className="flex items-center gap-3 mb-4">
              <Badge className="text-xs flex items-center gap-1.5 px-3 py-1">
                <CategoryIcon className="w-3.5 h-3.5" />
                {config.label}
              </Badge>
              <div className={`flex items-center gap-1.5 text-xs ${isRecent ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                <Clock className="w-3.5 h-3.5" />
                {timeAgo}
              </div>
              {story.source_name && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground font-medium">{story.source_name}</span>
                </>
              )}
            </div>

            {/* Headline */}
            <h1 className="text-3xl font-bold mb-4 leading-tight group-hover:text-primary transition-colors">
              {story.headline}
            </h1>

            {/* Summary */}
            <p className={`text-base text-muted-foreground leading-relaxed ${!showFullSummary && 'line-clamp-3'}`}>
              {story.summary}
            </p>
            {story.summary.length > 200 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullSummary(!showFullSummary);
                }}
                className="text-primary text-sm font-medium mt-2 hover:underline inline-flex items-center gap-1"
              >
                {showFullSummary ? 'Show less' : 'Read more...'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Engagement Metrics */}
        <div className="mb-6">
          <EngagementMetrics story={story} placement="below-key-points" showRelative={true} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button 
            className="flex-1 group/btn"
            size="lg"
            onClick={async (e) => {
              e.stopPropagation();
              await trackClick();
              window.open(story.source_url, '_blank');
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2 group-hover/btn:translate-x-0.5 transition-transform" />
            Read Article
          </Button>
          <Button 
            variant={isSaved ? 'default' : 'outline'} 
            size="lg"
            className="px-4"
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
          >
            <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Saved' : 'Save'}
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="px-4"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
