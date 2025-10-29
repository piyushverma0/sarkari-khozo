import { useState, useEffect } from 'react';
import { Link2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { relatedContent, RelatedItem } from '@/lib/relatedContent';
import { LiveDeadlineCountdown } from '@/components/LiveDeadlineCountdown';

interface RelatedItemsSectionProps {
  itemId: string;
  limit?: number;
  horizontal?: boolean;
}

export const RelatedItemsSection = ({
  itemId,
  limit = 6,
  horizontal = false,
}: RelatedItemsSectionProps) => {
  const [items, setItems] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelatedItems();
  }, [itemId]);

  const loadRelatedItems = async () => {
    setLoading(true);
    try {
      const related = await relatedContent.getRelatedItems({
        itemId,
        limit,
        minSimilarity: 0.3,
      });

      setItems(related);
    } catch (error) {
      console.error('Error loading related items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: RelatedItem) => {
    window.location.href = `/application/${item.id}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className={horizontal ? 'flex gap-4' : 'space-y-3'}>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className={horizontal ? 'h-32 w-64 flex-shrink-0' : 'h-24 w-full'}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            You Might Also Like
          </CardTitle>
          {items.length > 3 && !horizontal && (
            <Button variant="ghost" size="sm">
              See All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={horizontal ? 'flex gap-4 overflow-x-auto pb-2' : 'space-y-3'}>
          {items.map((item) => (
            <Card
              key={item.id}
              className={`hover:shadow-lg transition-shadow cursor-pointer group ${
                horizontal ? 'w-72 flex-shrink-0' : ''
              }`}
              onClick={() => handleItemClick(item)}
            >
              <CardContent className="py-4">
                <div className="mb-2">
                  <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">
                    {item.category}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {item.type}
                  </Badge>
                  {item.similarity >= 0.7 && (
                    <Badge variant="default" className="text-xs">
                      {Math.round(item.similarity * 100)}% Match
                    </Badge>
                  )}
                </div>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {item.deadline && (
                  <div className="flex items-center text-xs">
                    <LiveDeadlineCountdown
                      deadline={item.deadline}
                      showIcon={true}
                      className="text-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RelatedItemsSection;
