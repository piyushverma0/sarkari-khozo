import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Share2, ExternalLink, Clock, Eye } from 'lucide-react';
import { DiscoveryStory } from '@/types/discovery';
import { formatDistanceToNow } from 'date-fns';
import { formatViewCount } from '@/utils/formatViewCount';

interface MobileStoryCardProps {
  story: DiscoveryStory;
  isSaved: boolean;
  onSave: (storyId: string) => void;
  onShare: (story: DiscoveryStory) => void;
  onClick: (story: DiscoveryStory) => void;
}

const categoryColors = {
  exams: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  jobs: 'bg-green-500/10 text-green-500 border-green-500/20',
  schemes: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  policies: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

export const MobileStoryCard = ({ 
  story, 
  isSaved, 
  onSave, 
  onShare, 
  onClick 
}: MobileStoryCardProps) => {
  const timeAgo = formatDistanceToNow(new Date(story.published_date), { addSuffix: true });
  const categoryColor = categoryColors[story.category] || 'bg-gray-500/10 text-gray-500';

  return (
    <Card className="h-full flex flex-col p-6">
      {/* Header Row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge 
          variant="outline" 
          className={`${categoryColor} capitalize font-medium`}
        >
          {story.category}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{timeAgo}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="w-3 h-3" />
          <span>{formatViewCount(story.view_count)}</span>
        </div>
        {story.source_name && (
          <span className="text-xs text-muted-foreground">• {story.source_name}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-4">
        <h2 className="text-2xl font-bold leading-tight line-clamp-3">
          {story.headline}
        </h2>
        
        <p className="text-muted-foreground leading-relaxed line-clamp-4">
          {story.summary}
        </p>

        {story.key_takeaways && story.key_takeaways.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold">Key Points:</p>
            <ul className="text-sm space-y-1">
              {story.key_takeaways.slice(0, 3).map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span className="line-clamp-2">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t mt-4">
        <Button
          onClick={() => onClick(story)}
          className="flex-1"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Read Article
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onSave(story.id);
          }}
          className={isSaved ? 'bg-primary/10' : ''}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-primary' : ''}`} />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onShare(story);
          }}
        >
          <Share2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
