import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Calendar, MapPin, GraduationCap, CheckCircle2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Program {
  id?: string;
  title: string;
  description: string;
  url?: string;
  program_type?: string;
  funding_amount?: string;
  eligibility?: string;
  duration?: string;
  location?: string;
  documents_required?: any;
  important_dates?: any;
  application_process?: string;
}

interface LawyerProgramsListProps {
  programs: Program[];
  isLoading: boolean;
  searchQuery: string;
  onModifySearch: () => void;
}

const LawyerProgramsList = ({ programs, isLoading, searchQuery, onModifySearch }: LawyerProgramsListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [trackingProgram, setTrackingProgram] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("relevant");

  const toggleProgramSelection = (title: string) => {
    const newSelected = new Set(selectedPrograms);
    if (newSelected.has(title)) {
      newSelected.delete(title);
    } else {
      newSelected.add(title);
    }
    setSelectedPrograms(newSelected);
  };

  const handleTrackSelected = async () => {
    if (selectedPrograms.size === 0) {
      toast({
        title: "No programs selected",
        description: "Please select at least one program to track",
        variant: "destructive",
      });
      return;
    }

    setTrackingProgram("bulk");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to track programs",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const programsToTrack = programs.filter(p => selectedPrograms.has(p.title));
      
      for (const program of programsToTrack) {
        await supabase.from('applications').insert({
          user_id: user.id,
          title: program.title,
          description: program.description,
          category: "Legal",
          url: program.url,
          eligibility: program.eligibility,
          program_type: program.program_type,
          funding_amount: program.funding_amount,
          documents_required: program.documents_required,
          important_dates: program.important_dates,
        });
      }

      toast({
        title: "Success!",
        description: `${programsToTrack.length} programs added to your tracker`,
      });

      setSelectedPrograms(new Set());
      
    } catch (error) {
      console.error('Error tracking programs:', error);
      toast({
        title: "Error",
        description: "Failed to track programs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTrackingProgram(null);
    }
  };

  const handleViewDetails = (program: Program) => {
    navigate(`/application/${encodeURIComponent(program.title)}`, { 
      state: { 
        application: {
          title: program.title,
          description: program.description,
          category: "Legal",
          url: program.url,
          eligibility: program.eligibility,
          program_type: program.program_type,
          funding_amount: program.funding_amount,
          documents_required: program.documents_required,
          important_dates: program.important_dates,
        }
      } 
    });
  };

  // Filter programs
  const filteredPrograms = programs.filter(program => {
    if (filterType !== "all" && program.program_type !== filterType) return false;
    if (filterLocation !== "all" && program.location !== filterLocation) return false;
    return true;
  });

  // Sort programs
  const sortedPrograms = [...filteredPrograms].sort((a, b) => {
    if (sortBy === "deadline") {
      const dateA = a.important_dates?.application_deadline || "";
      const dateB = b.important_dates?.application_deadline || "";
      return dateA.localeCompare(dateB);
    }
    return 0;
  });

  const uniqueTypes = [...new Set(programs.map(p => p.program_type).filter(Boolean))];
  const uniqueLocations = [...new Set(programs.map(p => p.location).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Legal Opportunities</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Found {programs.length} programs matching your criteria
            </p>
          </div>
          <Button variant="outline" onClick={onModifySearch}>
            Modify Search
          </Button>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Program Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type!}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.map(location => (
                <SelectItem key={location} value={location!}>{location}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevant">Most Relevant</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Track Selected Button */}
        {selectedPrograms.size > 0 && (
          <Button onClick={handleTrackSelected} disabled={trackingProgram === "bulk"}>
            {trackingProgram === "bulk" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Track {selectedPrograms.size} Selected Program{selectedPrograms.size > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Programs Grid */}
      {sortedPrograms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No programs found matching your filters</p>
            <Button variant="outline" onClick={() => {
              setFilterType("all");
              setFilterLocation("all");
            }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedPrograms.map((program, index) => (
            <Card 
              key={index}
              className={`transition-all ${selectedPrograms.has(program.title) ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{program.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {program.program_type && (
                        <Badge variant="secondary">{program.program_type}</Badge>
                      )}
                      {program.funding_amount && (
                        <Badge variant="outline" className="bg-green-500/10">
                          💰 {program.funding_amount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {program.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {program.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{program.location}</span>
                    </div>
                  )}
                  {program.duration && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{program.duration}</span>
                    </div>
                  )}
                  {program.eligibility && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      <span className="line-clamp-1">{program.eligibility}</span>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button
                  variant={selectedPrograms.has(program.title) ? "default" : "outline"}
                  onClick={() => toggleProgramSelection(program.title)}
                  className="flex-1"
                >
                  {selectedPrograms.has(program.title) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Selected
                    </>
                  ) : (
                    "Select"
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleViewDetails(program)}
                  className="flex-1"
                >
                  View Details
                </Button>
                {program.url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                  >
                    <a href={program.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LawyerProgramsList;
