import { Users, Target, Flame, Info, TrendingUp, Clock, ChevronDown, Package, Scale, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import {
  formatIndianNumber,
  calculateRatio,
  getCompetitionLevel,
  getConfidenceBadgeVariant,
  getConfidenceLabel,
} from "@/utils/statsFormatting";

interface ApplicationStatsDisplayProps {
  stats: {
    applicants_count?: number;
    vacancies?: number;
    competition_ratio?: string;
    data_confidence?: string;
    data_source?: string;
    year?: number;
    live_count?: number;
    confidence_score?: number;
  };
  compact?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const ApplicationStatsDisplay = ({ stats, compact = false, onRefresh, isRefreshing = false }: ApplicationStatsDisplayProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!stats) return null;

  const { applicants_count, vacancies, data_confidence, data_source, year, live_count } = stats;

  // Calculate ratio if not provided
  const ratio = stats.competition_ratio || 
    (applicants_count && vacancies ? calculateRatio(applicants_count, vacancies) : null);

  const competitionLevel = ratio ? getCompetitionLevel(ratio) : "medium";

  // Compact view for list cards
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {applicants_count && (
          <Badge variant="secondary" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            {formatIndianNumber(applicants_count)}
          </Badge>
        )}
        {ratio && (
          <Badge 
            variant={competitionLevel === "high" ? "destructive" : "secondary"}
            className="text-xs"
          >
            <Flame className="w-3 h-3 mr-1" />
            {ratio}
          </Badge>
        )}
      </div>
    );
  }

  // Full detailed view
  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Application Insights
          </CardTitle>
          <div className="flex items-center gap-2">
            {data_confidence && (
              <Badge variant={getConfidenceBadgeVariant(data_confidence)} className="text-xs">
                {getConfidenceLabel(data_confidence)}
              </Badge>
            )}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
                title="Refresh statistics"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Compact 3-tile snapshot - Always show all 3 tiles */}
        <div className="grid grid-cols-3 gap-3">
          {/* Vacancies Tile */}
          {vacancies ? (
            <div className="flex flex-col items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Package className="w-4 h-4 mb-1 text-primary" />
              <p className="text-xs text-muted-foreground mb-1">Vacancies</p>
              <p className="text-xl font-bold">{formatIndianNumber(vacancies)}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/30 border border-border">
              <Package className="w-4 h-4 mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mb-1">Vacancies</p>
              <p className="text-sm text-muted-foreground">Not available</p>
            </div>
          )}

          {/* Applicants Tile */}
          {applicants_count ? (
            <div className="flex flex-col items-center p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <Users className="w-4 h-4 mb-1 text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-muted-foreground mb-1">Last Year</p>
              <p className="text-xl font-bold">{formatIndianNumber(applicants_count)}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/30 border border-border">
              <Users className="w-4 h-4 mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mb-1">Last Year</p>
              <p className="text-sm text-muted-foreground">Not available</p>
            </div>
          )}

          {/* Competition Tile */}
          {ratio && ratio !== "N/A" ? (
            <div className={`flex flex-col items-center p-3 rounded-lg border ${
              competitionLevel === "high" 
                ? "bg-destructive/5 border-destructive/10" 
                : competitionLevel === "medium"
                ? "bg-yellow-500/5 border-yellow-500/10"
                : "bg-green-500/5 border-green-500/10"
            }`}>
              <Scale className={`w-4 h-4 mb-1 ${
                competitionLevel === "high" ? "text-destructive" :
                competitionLevel === "medium" ? "text-yellow-600 dark:text-yellow-500" :
                "text-green-600 dark:text-green-500"
              }`} />
              <p className="text-xs text-muted-foreground mb-1">Competition</p>
              <p className="text-xl font-bold">{ratio}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/30 border border-border">
              <Scale className="w-4 h-4 mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mb-1">Competition</p>
              <p className="text-sm text-muted-foreground">Not available</p>
            </div>
          )}
        </div>

        {/* Progressive disclosure - See Details */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full text-sm h-8 gap-2"
            >
              <Info className="w-3.5 h-3.5" />
              {isOpen ? "Hide Details" : "See Details"}
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 pt-3">
            {live_count && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-accent">
                <Clock className="w-5 h-5 text-primary animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Live Registrations</p>
                  <p className="text-lg font-bold text-primary">{formatIndianNumber(live_count)} ⚡</p>
                </div>
              </div>
            )}

            {year && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="w-4 h-4" />
                <span>Data from {year} recruitment cycle</span>
              </div>
            )}

            {data_source && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border">
                <Info className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium mb-1">Source</p>
                  <p className="text-xs text-muted-foreground">{data_source}</p>
                </div>
              </div>
            )}

            {competitionLevel === "high" && ratio && (
              <Alert className="bg-destructive/10 border-destructive/20">
                <Flame className="h-4 w-4 text-destructive" />
                <AlertTitle className="text-sm font-semibold">High Competition Alert</AlertTitle>
                <AlertDescription className="text-xs">
                  This program is highly competitive with {ratio} applicants per vacancy. Apply early and prepare thoroughly.
                </AlertDescription>
              </Alert>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default ApplicationStatsDisplay;
