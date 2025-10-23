import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Share2, ExternalLink, Clock, Volume2 } from 'lucide-react';
import { DiscoveryStory } from '@/types/discovery';
import { formatDistanceToNow } from 'date-fns';
import { GraduationCap, Briefcase, Landmark, ScrollText } from 'lucide-react';

interface ReelsStoryCardProps {
  story: DiscoveryStory;
  onSave: () => void;
  onShare: () => void;
  isSaved: boolean;
}

export const ReelsStoryCard = ({ 
  story, 
  onSave, 
  onShare,
  isSaved 
}: ReelsStoryCardProps) => {
  const timeAgo = formatDistanceToNow(new Date(story.published_date), { addSuffix: true });

  // Category configuration with gradients
  const categoryConfig = {
    exams: { 
      icon: GraduationCap, 
      color: 'bg-blue-500',
      gradient: 'from-blue-500/20 via-blue-600/30 to-purple-600/20',
      label: 'Exams' 
    },
    jobs: { 
      icon: Briefcase, 
      color: 'bg-green-500',
      gradient: 'from-green-500/20 via-emerald-600/30 to-teal-600/20',
      label: 'Jobs' 
    },
    schemes: { 
      icon: Landmark, 
      color: 'bg-purple-500',
      gradient: 'from-purple-500/20 via-violet-600/30 to-indigo-600/20',
      label: 'Schemes' 
    },
    policies: { 
      icon: ScrollText, 
      color: 'bg-orange-500',
      gradient: 'from-orange-500/20 via-amber-600/30 to-yellow-600/20',
      label: 'Policies' 
    }
  };

  const config = categoryConfig[story.category];
  const IconComponent = config.icon;

  return (
    <div className="h-full w-full relative flex flex-col bg-background overflow-hidden">
      {/* Hero Section - Image or Placeholder */}
      <div className="relative h-[45vh] flex-shrink-0 overflow-hidden">
        {story.image_url ? (
          <img 
            src={story.image_url} 
            alt={story.headline}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${config.gradient} relative overflow-hidden`}>
            {/* Animated pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-grid-pattern animate-pulse" />
            </div>
            
            {/* Large centered icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <IconComponent className="w-32 h-32 text-white/40 animate-scale-in" />
            </div>
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}
        
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {/* Content Section */}
      <div className="flex-1 px-4 pt-4 pb-6 space-y-4 overflow-y-auto">
        {/* Metadata Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
          {story.source_name && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{story.source_name}</span>
            </>
          )}
        </div>

        {/* Headline */}
        <h2 className="text-2xl font-bold leading-tight line-clamp-2">
          {story.headline}
        </h2>

        {/* Summary/Hook */}
        <p className="text-base text-muted-foreground line-clamp-3">
          {story.summary}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              window.open(story.source_url, '_blank');
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Read Article
          </Button>
          
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
        </div>

        {/* Optional: Audio Listen Button */}
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement TTS functionality
          }}
        >
          <Volume2 className="w-4 h-4 mr-2" />
          Tap to listen
        </Button>
      </div>
    </div>
  );
};
