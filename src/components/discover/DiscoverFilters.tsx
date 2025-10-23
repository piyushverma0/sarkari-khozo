import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, TrendingUp, Clock, Sparkles } from 'lucide-react';
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
    { value: 'exams', label: 'Exams', icon: '🎓' },
    { value: 'jobs', label: 'Jobs', icon: '💼' },
    { value: 'schemes', label: 'Schemes', icon: '🏛️' },
    { value: 'policies', label: 'Policies', icon: '📜' }
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant', icon: Sparkles },
    { value: 'trending', label: 'Trending', icon: TrendingUp },
    { value: 'recent', label: 'Recent', icon: Clock }
  ];

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <Tabs 
        value={filters.category} 
        onValueChange={(value) => onFilterChange({ category: value as any })}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-5 gap-1">
          {categories.map((cat) => (
            <TabsTrigger 
              key={cat.value} 
              value={cat.value}
              className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs"
            >
              {typeof cat.icon === 'string' ? (
                <span className="text-base">{cat.icon}</span>
              ) : (
                <cat.icon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Region and Sort Filters */}
      <div className="flex items-center justify-between gap-3">
        {/* Region Filter */}
        <Select 
          value={filters.region || 'National'} 
          onValueChange={(value) => onFilterChange({ region: value })}
        >
          <SelectTrigger className="w-[160px]">
            <MapPin className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Region" />
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

        {/* Sort Filter */}
        <div className="flex items-center gap-1">
          {sortOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={filters.sort === opt.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onFilterChange({ sort: opt.value as any })}
              className="flex items-center gap-1.5 text-xs"
            >
              <opt.icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{opt.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
