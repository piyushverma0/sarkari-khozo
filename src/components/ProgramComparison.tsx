import { useState, useEffect } from "react";
import { X, DollarSign, Calendar, FileText, TrendingUp, Award, MapPin, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Program {
  id?: string;
  title: string;
  description: string;
  url?: string;
  category?: string;
  program_type?: string;
  funding_amount?: string;
  sector?: string;
  stage?: string;
  state_specific?: string;
  success_rate?: string;
  dpiit_required?: boolean;
  important_dates?: any;
  documents_required?: any;
  eligibility?: string;
}

interface ProgramComparisonProps {
  currentProgram: Program;
  onClose: () => void;
  onTrack?: (programs: Program[]) => void;
}

const ProgramComparison = ({ currentProgram, onClose, onTrack }: ProgramComparisonProps) => {
  const [similarPrograms, setSimilarPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    findSimilarPrograms();
  }, [currentProgram]);

  const findSimilarPrograms = async () => {
    setIsLoading(true);
    try {
      // Call the find-startup-programs edge function with similar criteria
      const { data, error } = await supabase.functions.invoke('find-startup-programs', {
        body: {
          stage: currentProgram.stage,
          sector: currentProgram.sector,
          state: currentProgram.state_specific,
          program_type: currentProgram.program_type,
        },
      });

      if (error) throw error;

      // Filter out the current program and limit to 2-3 similar ones
      const filtered = (data || [])
        .filter((p: Program) => p.title !== currentProgram.title)
        .slice(0, 3);
      
      setSimilarPrograms(filtered);
    } catch (error: any) {
      console.error('Error finding similar programs:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to find similar programs.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProgramSelection = (programTitle: string) => {
    const newSelection = new Set(selectedPrograms);
    if (newSelection.has(programTitle)) {
      newSelection.delete(programTitle);
    } else {
      newSelection.add(programTitle);
    }
    setSelectedPrograms(newSelection);
  };

  const handleTrackSelected = () => {
    const programsToTrack = [currentProgram, ...similarPrograms].filter(p =>
      selectedPrograms.has(p.title) || p.title === currentProgram.title
    );
    onTrack?.(programsToTrack);
    toast({
      title: 'Programs Tracked',
      description: `Now tracking ${programsToTrack.length} program(s)`,
    });
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

  const renderProgramCard = (program: Program, isCurrent: boolean = false) => {
    const isSelected = selectedPrograms.has(program.title) || isCurrent;

    return (
      <Card
        key={program.title}
        className={`relative transition-all ${
          isSelected ? 'ring-2 ring-primary shadow-lg' : ''
        }`}
      >
        {isCurrent && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground">Current Program</Badge>
          </div>
        )}
        
        <CardHeader className="pb-3">
          <CardTitle className="text-lg line-clamp-2">{program.title}</CardTitle>
          <div className="flex flex-wrap gap-2 mt-2">
            {program.program_type && (
              <Badge variant="secondary" className="text-xs">
                {program.program_type.replace(/_/g, ' ')}
              </Badge>
            )}
            {program.success_rate && (
              <Badge variant="outline" className={getSuccessRateColor(program.success_rate)}>
                <TrendingUp className="w-3 h-3 mr-1" />
                {program.success_rate} Success
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Funding Amount */}
          {program.funding_amount && (
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Funding</div>
                <div className="font-semibold">{program.funding_amount}</div>
              </div>
            </div>
          )}

          {/* Stage & Sector */}
          <div className="flex items-start gap-2">
            <Building className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Stage & Sector</div>
              <div className="text-sm">
                {program.stage || 'All Stages'} • {program.sector || 'All Sectors'}
              </div>
            </div>
          </div>

          {/* Location */}
          {program.state_specific && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Location</div>
                <div className="text-sm">{program.state_specific}</div>
              </div>
            </div>
          )}

          {/* DPIIT Required */}
          {program.dpiit_required !== undefined && (
            <div className="flex items-start gap-2">
              <Award className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">DPIIT Recognition</div>
                <div className="text-sm">
                  {program.dpiit_required ? 'Required' : 'Not Required'}
                </div>
              </div>
            </div>
          )}

          {/* Documents Count */}
          {program.documents_required && (
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Documents</div>
                <div className="text-sm">
                  {Array.isArray(program.documents_required)
                    ? program.documents_required.length
                    : JSON.parse(program.documents_required as any).length}{' '}
                  required
                </div>
              </div>
            </div>
          )}

          {/* Deadline */}
          {program.important_dates?.application_end && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Application Deadline</div>
                <div className="text-sm">
                  {new Date(program.important_dates.application_end).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            {!isCurrent && (
              <Button
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => toggleProgramSelection(program.title)}
              >
                {isSelected ? 'Selected' : 'Select to Track'}
              </Button>
            )}
            {program.url && (
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <a href={program.url} target="_blank" rel="noopener noreferrer">
                  View Details
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-bold">Compare Similar Programs</h3>
          <p className="text-muted-foreground mt-1">
            Find and track programs that match your startup's profile
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            {renderProgramCard(currentProgram, true)}
            {similarPrograms.map((program) => renderProgramCard(program))}
          </div>

          {similarPrograms.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No similar programs found at the moment. Try adjusting your search criteria.
              </p>
            </Card>
          )}

          {selectedPrograms.size > 0 && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleTrackSelected}>
                Track {selectedPrograms.size + 1} Program(s)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProgramComparison;
