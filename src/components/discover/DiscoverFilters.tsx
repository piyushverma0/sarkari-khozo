import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { MapPin, TrendingUp, Clock, Sparkles, Briefcase, GraduationCap, Landmark, ScrollText, Globe, Users, BookOpen } from 'lucide-react';
import { FeedFilters } from '@/types/discovery';

interface DiscoverFiltersProps {
  filters: FeedFilters;
  onFilterChange: (filters: Partial<FeedFilters>) => void;
  userState?: string;
}

export const DiscoverFilters = ({ 
  filters, 
  onFilterChange,
  userState 
}: DiscoverFiltersProps) => {
  const categories = [
    { value: 'all', label: 'For You', icon: Sparkles },
    { value: 'exams', label: 'Exams', icon: GraduationCap },
    { value: 'jobs', label: 'Jobs', icon: Briefcase },
    { value: 'schemes', label: 'Schemes', icon: Landmark },
    { value: 'policies', label: 'Policies', icon: ScrollText },
    { value: 'current-affairs', label: 'Current Affairs', icon: ScrollText },
    { value: 'international', label: 'International', icon: Globe },
    { value: 'education', label: 'Education', icon: BookOpen },
    { value: 'diplomatic', label: 'Diplomatic', icon: Users }
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant', icon: Sparkles },
    { value: 'trending', label: 'Trending', icon: TrendingUp },
    { value: 'recent', label: 'Recent', icon: Clock }
  ];

  return (
    <Card className="p-6 space-y-6 bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold mb-2">Make it yours</h2>
        <p className="text-sm text-muted-foreground">
          Select topics and interests to customize your Discover experience
        </p>
      </div>

      {/* Category Filters */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Topics</h3>
        <div className="flex flex-col gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={filters.category === cat.value ? 'default' : 'outline'}
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => onFilterChange({ category: cat.value as any })}
            >
              <cat.icon className="w-5 h-5" />
              <span>{cat.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Region Filter */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Region</h3>
        <Select 
          value={filters.region || 'National'} 
          onValueChange={(value) => onFilterChange({ region: value })}
        >
          <SelectTrigger className="w-full">
            <MapPin className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Select Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="National">National</SelectItem>
            {userState && (
              <SelectItem value={userState}>My State ({userState})</SelectItem>
            )}
            <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
            <SelectItem value="Bihar">Bihar</SelectItem>
            <SelectItem value="Delhi">Delhi</SelectItem>
            <SelectItem value="Gujarat">Gujarat</SelectItem>
            <SelectItem value="Karnataka">Karnataka</SelectItem>
            <SelectItem value="Kerala">Kerala</SelectItem>
            <SelectItem value="Maharashtra">Maharashtra</SelectItem>
            <SelectItem value="Punjab">Punjab</SelectItem>
            <SelectItem value="Rajasthan">Rajasthan</SelectItem>
            <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
            <SelectItem value="Telangana">Telangana</SelectItem>
            <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
            <SelectItem value="West Bengal">West Bengal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort Options */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Sort By</h3>
        <div className="flex flex-col gap-2">
          {sortOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={filters.sort === opt.value ? 'default' : 'outline'}
              className="w-full justify-start gap-3"
              onClick={() => onFilterChange({ sort: opt.value as any })}
            >
              <opt.icon className="w-4 h-4" />
              <span>{opt.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
};
