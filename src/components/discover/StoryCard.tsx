import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Share2, ExternalLink, Clock, Eye } from 'lucide-react';
import { DiscoveryStory } from '@/types/discovery';
import { formatDistanceToNow } from 'date-fns';
import { formatViewCount } from '@/utils/formatViewCount';

interface StoryCardProps {
  story: DiscoveryStory;
  viewMode: 'full' | 'compact';
  onSave?: () => void;
  onShare?: () => void;
  onView?: () => void;
  isSaved?: boolean;
}

export const StoryCard = ({ 
  story, 
  viewMode, 
  onSave, 
  onShare, 
  onView,
  isSaved = false 
}: StoryCardProps) => {
  const [showFullSummary, setShowFullSummary] = useState(false);

  // Category icons and colors
  const categoryConfig = {
    exams: { icon: '🎓', color: 'bg-blue-500', label: 'Exams' },
    jobs: { icon: '💼', color: 'bg-green-500', label: 'Jobs' },
    schemes: { icon: '🏛️', color: 'bg-purple-500', label: 'Schemes' },
    policies: { icon: '📜', color: 'bg-orange-500', label: 'Policies' }
  };

  const config = categoryConfig[story.category];
  const publishedDate = new Date(story.published_date);
  const hoursOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
  const isNew = hoursOld < 6; // Less than 6 hours old
  const isRecent = hoursOld < 24; // Less than 24 hours old
  
  // Format time differently based on age
  let timeAgo;
  if (hoursOld < 1) {
    timeAgo = 'Just now';
  } else if (hoursOld < 24) {
    timeAgo = `${Math.floor(hoursOld)}h ago`;
  } else {
    timeAgo = formatDistanceToNow(publishedDate, { addSuffix: true });
  }

  if (viewMode === 'compact') {
    return (
      <Card 
        className="overflow-hidden hover:bg-muted/20 transition-all duration-200 cursor-pointer border-border/50"
        onClick={onView}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-base line-clamp-2 flex-1">
              {story.headline}
            </h3>
            {onSave && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onSave();
                }}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </Button>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {story.summary}
          </p>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              {config.label}
            </Badge>
            {isNew && (
              <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
                🔥 New
              </Badge>
            )}
            <span className={`flex items-center gap-1 ${isRecent ? 'text-green-600 font-medium' : ''}`}>
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatViewCount(story.view_count)}
            </span>
            {story.source_name && (
              <>
                <span>•</span>
                <span>{story.source_name}</span>
              </>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Full view - Featured story
  return (
    <Card 
      className="overflow-hidden hover:bg-muted/20 transition-all duration-200 cursor-pointer border-border/50"
      onClick={onView}
    >
      <div className="p-6">
        {/* Metadata */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="text-xs">
            {config.label}
          </Badge>
          {isNew && (
            <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
              🔥 New
            </Badge>
          )}
          <span className={`text-xs flex items-center gap-1 ${isRecent ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatViewCount(story.view_count)}
          </span>
          {story.source_name && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{story.source_name}</span>
            </>
          )}
        </div>

        {/* Headline */}
        <h2 className="text-2xl font-bold mb-3 leading-tight">
          {story.headline}
        </h2>

        {/* Summary */}
        <p className={`text-base text-muted-foreground mb-4 ${!showFullSummary && 'line-clamp-3'}`}>
          {story.summary}
        </p>
        {story.summary.length > 200 && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowFullSummary(!showFullSummary);
            }}
            className="text-primary text-sm font-medium mb-4 hover:underline"
          >
            {showFullSummary ? 'Show less' : 'Read more...'}
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button 
            className="flex-1"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.open(story.source_url, '_blank');
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Read Article
          </Button>
          {onSave && (
            <Button 
              variant={isSaved ? 'default' : 'outline'} 
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
          )}
          {onShare && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
