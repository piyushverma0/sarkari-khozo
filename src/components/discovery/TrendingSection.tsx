import { useState, useEffect } from 'react';
import { TrendingUp, Flame, ArrowUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trendingService, TrendingItem } from '@/lib/trendingService';
import { LiveDeadlineCountdown } from '@/components/LiveDeadlineCountdown';

interface TrendingSectionProps {
  userId?: string;
  limit?: number;
}

export const TrendingSection = ({ userId, limit = 10 }: TrendingSectionProps) => {
  const [trendingDay, setTrendingDay] = useState<TrendingItem[]>([]);
  const [trendingWeek, setTrendingWeek] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    try {
      const [day, week] = await Promise.all([
        trendingService.getTrending({ timeWindow: 'day', limit }),
        trendingService.getTrending({ timeWindow: 'week', limit }),
      ]);

      setTrendingDay(day);
      setTrendingWeek(week);
    } catch (error) {
      console.error('Error loading trending:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: TrendingItem) => {
    window.location.href = `/application/${item.id}`;
  };

  const renderTrendingItems = (items: TrendingItem[]) => {
    if (items.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          <Flame className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No trending items yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <Card
            key={item.id}
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => handleItemClick(item)}
          >
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                {/* Rank */}
                <div className="flex-shrink-0 w-8">
                  {index < 3 ? (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0
                          ? 'bg-yellow-500 text-yellow-950'
                          : index === 1
                          ? 'bg-gray-400 text-gray-900'
                          : 'bg-amber-600 text-amber-950'
                      }`}
                    >
                      {index + 1}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-medium text-sm text-muted-foreground">
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                    {item.growthRate > 50 && (
                      <Badge variant="destructive" className="flex-shrink-0 gap-1">
                        <ArrowUp className="w-3 h-3" />
                        Hot
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {item.type}
                    </Badge>
                    {item.tags?.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{item.viewCount.toLocaleString()} views</span>
                    </div>
                    {item.applicationCount > 0 && (
                      <span>• {item.applicationCount} applied</span>
                    )}
                    {item.deadline && (
                      <div className="flex items-center gap-1">
                        •
                        <LiveDeadlineCountdown
                          deadline={item.deadline}
                          showIcon={false}
                          className="text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Trending Now
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="week" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="day" className="flex-1">
              Today
            </TabsTrigger>
            <TabsTrigger value="week" className="flex-1">
              This Week
            </TabsTrigger>
          </TabsList>

          <TabsContent value="day" className="mt-4">
            {renderTrendingItems(trendingDay)}
          </TabsContent>

          <TabsContent value="week" className="mt-4">
            {renderTrendingItems(trendingWeek)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TrendingSection;
