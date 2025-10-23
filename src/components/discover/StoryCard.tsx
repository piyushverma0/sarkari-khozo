import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Share2, ExternalLink, Clock, MapPin } from 'lucide-react';
import { DiscoveryStory } from '@/types/discovery';
import { formatDistanceToNow } from 'date-fns';

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);

  // Category icons and colors
  const categoryConfig = {
    exams: { icon: '🎓', color: 'bg-blue-500', label: 'Exams' },
    jobs: { icon: '💼', color: 'bg-green-500', label: 'Jobs' },
    schemes: { icon: '🏛️', color: 'bg-purple-500', label: 'Schemes' },
    policies: { icon: '📜', color: 'bg-orange-500', label: 'Policies' }
  };

  // Category-specific fallback images
  const getCategoryFallback = (category: string) => {
    const fallbacks = {
      exams: {
        emoji: '📚',
        gradient: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(217 91% 60% / 0.7) 100%)',
      },
      jobs: {
        emoji: '💼',
        gradient: 'linear-gradient(135deg, hsl(142 76% 36%) 0%, hsl(142 76% 36% / 0.7) 100%)',
      },
      schemes: {
        emoji: '🎯',
        gradient: 'linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(262 83% 58% / 0.7) 100%)',
      },
      policies: {
        emoji: '📋',
        gradient: 'linear-gradient(135deg, hsl(24 95% 53%) 0%, hsl(24 95% 53% / 0.7) 100%)',
      }
    };
    return fallbacks[category as keyof typeof fallbacks] || fallbacks.policies;
  };

  const config = categoryConfig[story.category];
  const fallback = getCategoryFallback(story.category);
  const timeAgo = formatDistanceToNow(new Date(story.published_date), { addSuffix: true });

  if (viewMode === 'compact') {
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
            onClick={onView}>
        <div className="flex gap-3 p-4">
          <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
            {story.image_url ? (
              <img 
                src={story.image_url} 
                alt={story.image_alt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-4xl"
                style={{ background: fallback.gradient }}
              >
                {fallback.emoji}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">
                {config.icon} {config.label}
              </Badge>
              {story.region !== 'National' && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {story.region}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-sm line-clamp-2 mb-1">
              {story.headline}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {story.excerpt}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo}
              </span>
              <span>{story.source_name}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Full view (for mobile swipe)
  return (
    <Card className="overflow-hidden h-full flex flex-col glass-card">
      {/* Image Section */}
      <div className="relative w-full aspect-video">
        {story.image_url ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-muted" />
            )}
            <img 
              src={story.image_url} 
              alt={story.image_alt}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: fallback.gradient }}
          >
            <span className="text-8xl">{fallback.emoji}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Metadata */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge className={`${config.color} text-white`}>
            {config.icon} {config.label}
          </Badge>
          <span className="text-sm text-muted-foreground">{story.source_name}</span>
          <span className="text-sm text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
          {story.region !== 'National' && (
            <>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {story.region}
              </span>
            </>
          )}
        </div>

        {/* Headline */}
        <h2 className="text-2xl font-bold mb-3 leading-tight">
          {story.headline}
        </h2>

        {/* Summary */}
        <p className={`text-base text-muted-foreground mb-4 ${!showFullSummary && 'line-clamp-4'}`}>
          {story.summary}
        </p>
        {story.summary.length > 200 && (
          <button 
            onClick={() => setShowFullSummary(!showFullSummary)}
            className="text-primary text-sm font-medium mb-4 hover:underline self-start"
          >
            {showFullSummary ? 'Show less' : 'Read more...'}
          </button>
        )}

        {/* Impact Statement */}
        {story.impact_statement && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium flex items-start gap-2">
              <span className="text-lg">💡</span>
              <span>{story.impact_statement}</span>
            </p>
          </div>
        )}

        {/* Key Takeaways */}
        {story.key_takeaways && story.key_takeaways.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">Key Takeaways:</h3>
            <ul className="space-y-1">
              {story.key_takeaways.map((takeaway, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">🔹</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags */}
        {story.tags && story.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {story.tags.slice(0, 5).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t mt-4">
          <Button 
            className="flex-1" 
            onClick={() => window.open(story.source_url, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Read Full Article
          </Button>
          <Button 
            variant={isSaved ? 'default' : 'outline'} 
            size="icon"
            onClick={onSave}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={onShare}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Engagement Stats */}
        {(story.save_count > 0 || story.view_count > 0) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
            {story.save_count > 0 && (
              <span>{story.save_count} {story.save_count === 1 ? 'save' : 'saves'}</span>
            )}
            {story.view_count > 0 && (
              <span>{story.view_count} {story.view_count === 1 ? 'view' : 'views'}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
