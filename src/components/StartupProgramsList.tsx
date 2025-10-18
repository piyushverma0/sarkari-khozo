import { useState } from "react";
import { DollarSign, Calendar, Award, MapPin, TrendingUp, Filter, SortAsc, X, CheckCircle2, Eye, Bookmark, Rocket, Search, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Program {
  id?: string;
  title: string;
  description: string;
  url?: string;
  program_type?: string;
  funding_amount?: string;
  sector?: string;
  stage?: string;
  state_specific?: string;
  success_rate?: string;
  dpiit_required?: boolean;
  important_dates?: any;
  eligibility?: string;
  documents_required?: any;
}

interface StartupProgramsListProps {
  programs: Program[];
  isLoading?: boolean;
  searchQuery?: string;
  onModifySearch?: () => void;
}

const StartupProgramsList = ({
  programs,
  isLoading = false,
  searchQuery,
  onModifySearch,
}: StartupProgramsListProps) => {
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>(programs);
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedProgramType, setSelectedProgramType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("deadline");
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();

  // Update filtered programs when filters change
  useState(() => {
    let filtered = [...programs];

    // Apply filters
    if (selectedStage !== "all") {
      filtered = filtered.filter(p => p.stage?.includes(selectedStage));
    }
    if (selectedSector !== "all") {
      filtered = filtered.filter(p => p.sector?.includes(selectedSector));
    }
    if (selectedState !== "all") {
      filtered = filtered.filter(p => p.state_specific === selectedState || p.state_specific === "All India");
    }
    if (selectedProgramType !== "all") {
      filtered = filtered.filter(p => p.program_type === selectedProgramType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "deadline":
          const dateA = a.important_dates?.application_end ? new Date(a.important_dates.application_end).getTime() : Infinity;
          const dateB = b.important_dates?.application_end ? new Date(b.important_dates.application_end).getTime() : Infinity;
          return dateA - dateB;
        case "funding":
          const fundingA = parseFunding(a.funding_amount);
          const fundingB = parseFunding(b.funding_amount);
          return fundingB - fundingA;
        case "success_rate":
          const rateA = getRateValue(a.success_rate);
          const rateB = getRateValue(b.success_rate);
          return rateB - rateA;
        default:
          return 0;
      }
    });

    setFilteredPrograms(filtered);
  });

  const parseFunding = (funding?: string): number => {
    if (!funding) return 0;
    const match = funding.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const getRateValue = (rate?: string): number => {
    switch (rate?.toLowerCase()) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  const getSuccessRateColor = (rate?: string) => {
    switch (rate?.toLowerCase()) {
      case 'high':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatProgramType = (type?: string) => {
    if (!type) return '';
    return type.replace(/_/g, ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const toggleProgramSelection = (title: string) => {
    const newSelection = new Set(selectedPrograms);
    if (newSelection.has(title)) {
      newSelection.delete(title);
    } else {
      newSelection.add(title);
    }
    setSelectedPrograms(newSelection);
  };

  const handleTrackAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Authentication Required',
          description: 'Please sign in to track programs.',
        });
        navigate('/auth');
        return;
      }

      const programsToTrack = filteredPrograms.filter(p => selectedPrograms.has(p.title));
      
      for (const program of programsToTrack) {
        await supabase.from('applications').insert({
          user_id: user.id,
          title: program.title,
          description: program.description,
          url: program.url,
          category: 'Startups',
          program_type: program.program_type,
          funding_amount: program.funding_amount,
          sector: program.sector,
          stage: program.stage,
          state_specific: program.state_specific,
          success_rate: program.success_rate,
          dpiit_required: program.dpiit_required,
          important_dates: program.important_dates,
          eligibility: program.eligibility,
          documents_required: program.documents_required,
        });
      }

      toast({
        title: 'Programs Tracked',
        description: `Successfully added ${programsToTrack.length} program(s) to your tracker.`,
      });
      setSelectedPrograms(new Set());
    } catch (error: any) {
      console.error('Error tracking programs:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to track programs. Please try again.',
      });
    }
  };

  const handleViewDetails = (program: Program) => {
    navigate('/application', { state: { application: program } });
  };

  const activeFiltersCount = 
    (selectedStage !== "all" ? 1 : 0) +
    (selectedSector !== "all" ? 1 : 0) +
    (selectedState !== "all" ? 1 : 0) +
    (selectedProgramType !== "all" ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedStage("all");
    setSelectedSector("all");
    setSelectedState("all");
    setSelectedProgramType("all");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-fade-in">
              <CardHeader>
                <div className="h-6 w-3/4 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                    <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                  </div>
                  <div className="h-10 w-full bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search Query */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-2xl font-bold">
            Showing {filteredPrograms.length} result{filteredPrograms.length !== 1 ? 's' : ''}
            {searchQuery && <span className="text-muted-foreground"> for: "{searchQuery}"</span>}
          </h3>
          {activeFiltersCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {onModifySearch && (
            <Button variant="outline" onClick={onModifySearch}>
              <Filter className="w-4 h-4 mr-2" />
              Modify Search
            </Button>
          )}
          {selectedPrograms.size > 0 && (
            <Button onClick={handleTrackAll}>
              <Bookmark className="w-4 h-4 mr-2" />
              Track {selectedPrograms.size} Program{selectedPrograms.size !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Sort */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <div className="flex flex-wrap gap-2 flex-1">
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="Idea">Idea</SelectItem>
                  <SelectItem value="Prototype">Prototype</SelectItem>
                  <SelectItem value="Revenue">Revenue</SelectItem>
                  <SelectItem value="Growth">Growth</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  <SelectItem value="Tech">Tech</SelectItem>
                  <SelectItem value="AgriTech">AgriTech</SelectItem>
                  <SelectItem value="HealthTech">HealthTech</SelectItem>
                  <SelectItem value="FinTech">FinTech</SelectItem>
                  <SelectItem value="EdTech">EdTech</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="All India">All India</SelectItem>
                  <SelectItem value="Karnataka">Karnataka</SelectItem>
                  <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                  <SelectItem value="Delhi">Delhi</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedProgramType} onValueChange={setSelectedProgramType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Program Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="grant">Grant</SelectItem>
                  <SelectItem value="seed_funding">Seed Funding</SelectItem>
                  <SelectItem value="incubation">Incubation</SelectItem>
                  <SelectItem value="accelerator">Accelerator</SelectItem>
                  <SelectItem value="policy_benefit">Policy Benefit</SelectItem>
                </SelectContent>
              </Select>

              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <SortAsc className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sort by:</span>
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Deadline (Earliest)</SelectItem>
                <SelectItem value="funding">Funding (Highest)</SelectItem>
                <SelectItem value="success_rate">Success Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedStage !== "all" && (
            <Badge variant="secondary" className="gap-2">
              Stage: {selectedStage}
              <button onClick={() => setSelectedStage("all")} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {selectedSector !== "all" && (
            <Badge variant="secondary" className="gap-2">
              Sector: {selectedSector}
              <button onClick={() => setSelectedSector("all")} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {selectedState !== "all" && (
            <Badge variant="secondary" className="gap-2">
              State: {selectedState}
              <button onClick={() => setSelectedState("all")} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {selectedProgramType !== "all" && (
            <Badge variant="secondary" className="gap-2">
              Type: {formatProgramType(selectedProgramType)}
              <button onClick={() => setSelectedProgramType("all")} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Programs Grid */}
      {filteredPrograms.length === 0 ? (
        <Card className="text-center p-12">
          <div className="flex flex-col items-center gap-6">
            <div className="p-6 rounded-full bg-muted">
              <Rocket className="w-16 h-16 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">No programs found</h3>
              <p className="text-muted-foreground max-w-md">
                Try adjusting your filters or modify your search to find programs.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={clearAllFilters} variant="outline">
                <XCircle className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
              {onModifySearch && (
                <Button onClick={onModifySearch}>
                  <Search className="w-4 h-4 mr-2" />
                  Modify Search
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map((program) => {
            const isSelected = selectedPrograms.has(program.title);
            
            return (
              <Card
                key={program.title}
                className={`hover-scale transition-all ${
                  isSelected ? 'ring-2 ring-primary' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-lg line-clamp-2 flex-1">
                      {program.title}
                    </CardTitle>
                    {program.dpiit_required && (
                      <Badge variant="outline" className="flex-shrink-0 text-xs">
                        DPIIT
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2 text-sm">
                    {program.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {program.program_type && (
                      <Badge variant="default" className="text-xs">
                        {formatProgramType(program.program_type)}
                      </Badge>
                    )}
                    {program.funding_amount && (
                      <Badge variant="secondary" className="text-xs">
                        {program.funding_amount}
                      </Badge>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {program.important_dates?.application_end && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Deadline: {new Date(program.important_dates.application_end).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {program.state_specific && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{program.state_specific}</span>
                      </div>
                    )}
                    {program.success_rate && (
                      <Badge variant="outline" className="text-xs">
                        {program.success_rate}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleProgramSelection(program.title)}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Selected
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4 mr-1" />
                          Select
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewDetails(program)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StartupProgramsList;
