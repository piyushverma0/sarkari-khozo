import { useState } from "react";
import { DollarSign, Calendar, Award, MapPin, TrendingUp, Filter, SortAsc, X, CheckCircle2, Eye, Bookmark, Rocket, Search, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
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
      <Card className="bg-slate-800/40">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="w-[150px] bg-background">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="Idea">Idea</SelectItem>
                <SelectItem value="Prototype">Prototype</SelectItem>
                <SelectItem value="Revenue">Revenue</SelectItem>
                <SelectItem value="Growth">Growth</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-[150px] bg-background">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Sectors</SelectItem>
                <SelectItem value="Tech">Tech</SelectItem>
                <SelectItem value="AgriTech">AgriTech</SelectItem>
                <SelectItem value="HealthTech">HealthTech</SelectItem>
                <SelectItem value="FinTech">FinTech</SelectItem>
                <SelectItem value="EdTech">EdTech</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-[150px] bg-background">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="All India">All India</SelectItem>
                <SelectItem value="Karnataka">Karnataka</SelectItem>
                <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                <SelectItem value="Delhi">Delhi</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedProgramType} onValueChange={setSelectedProgramType}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Program Type" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
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

          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <SortAsc className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sort by:</span>
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
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
        <div className="text-center py-16">
          <div className="flex justify-center mb-6">
            <div 
              className="p-6 rounded-full"
              style={{ background: "var(--gradient-startup)" }}
            >
              <Rocket className="h-16 w-16" style={{ color: "hsl(var(--startup-teal))" }} />
            </div>
          </div>
          <h3 className="text-2xl font-semibold mb-3 startup-gradient-text">
            No programs match your criteria yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Try adjusting your filters or explore all opportunities to find the perfect fit for your startup.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={clearAllFilters} variant="outline" className="gap-2">
              <XCircle className="h-4 w-4" />
              Clear Filters
            </Button>
            {onModifySearch && (
              <Button onClick={onModifySearch} className="gap-2">
                <Search className="h-4 w-4" />
                Modify Search
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrograms.map((program) => {
            const isSelected = selectedPrograms.has(program.title);
            
            return (
              <Card
                key={program.title}
                className={`relative startup-card-hover transition-all ${
                  isSelected ? 'ring-2 ring-primary' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2 flex-1">
                      {program.title}
                    </CardTitle>
                    {program.dpiit_required && (
                      <Badge variant="outline" className="flex-shrink-0">
                        <Award className="w-3 h-3 mr-1" />
                        DPIIT
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {program.program_type && (
                      <Badge variant="secondary" className="text-xs">
                        {formatProgramType(program.program_type)}
                      </Badge>
                    )}
                    {program.funding_amount && (
                      <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                        {program.funding_amount}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Deadline */}
                  {program.important_dates?.application_end && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Deadline:</span>
                      <span className="font-medium">
                        {new Date(program.important_dates.application_end).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {/* Location & Success Rate */}
                  <div className="flex items-center justify-between text-sm">
                    {program.state_specific && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{program.state_specific}</span>
                      </div>
                    )}
                    {program.success_rate && (
                      <Badge variant="outline" className={`text-xs ${getSuccessRateColor(program.success_rate)}`}>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {program.success_rate}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleProgramSelection(program.title)}
                      className={isSelected ? 'bg-primary text-primary-foreground' : ''}
                    >
                      {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="col-span-2"
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
