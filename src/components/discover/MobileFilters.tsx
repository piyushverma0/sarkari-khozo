import { Button } from '@/components/ui/button';
import { FeedFilters } from '@/types/discovery';

interface MobileFiltersProps {
  filters: FeedFilters;
  onFilterChange: (filters: FeedFilters) => void;
}

export const MobileFilters = ({ filters, onFilterChange }: MobileFiltersProps) => {
  const categories = [
    { value: 'all', label: 'For You' },
    { value: 'exams', label: 'Exams' },
    { value: 'jobs', label: 'Jobs' },
    { value: 'schemes', label: 'Schemes' },
    { value: 'policies', label: 'Policies' },
  ] as const;

  return (
    <div className="w-full overflow-x-auto bg-background border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2 px-4 py-3 min-w-max">
        {categories.map((cat) => (
          <Button
            key={cat.value}
            variant={filters.category === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange({ ...filters, category: cat.value })}
            className="rounded-full whitespace-nowrap"
          >
            {cat.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
