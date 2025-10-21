import { Users, Target, Flame, Info, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
}

const ApplicationStatsDisplay = ({ stats, compact = false }: ApplicationStatsDisplayProps) => {
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
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Application Statistics {year && `(${year})`}
          </CardTitle>
          {data_confidence && (
            <Badge variant={getConfidenceBadgeVariant(data_confidence)}>
              {getConfidenceLabel(data_confidence)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3">
          {applicants_count && (
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Applicants</p>
                <p className="text-lg font-semibold">{formatIndianNumber(applicants_count)}</p>
              </div>
            </div>
          )}

          {vacancies && (
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Vacancies</p>
                <p className="text-lg font-semibold">{formatIndianNumber(vacancies)}</p>
              </div>
            </div>
          )}

          {ratio && (
            <div className="flex items-center gap-3">
              <Flame 
                className={`w-5 h-5 ${
                  competitionLevel === "high" ? "text-destructive" :
                  competitionLevel === "medium" ? "text-yellow-500" :
                  "text-green-500"
                }`} 
              />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Competition</p>
                <p className="text-lg font-semibold">~{ratio}</p>
              </div>
            </div>
          )}

          {live_count && (
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary animate-pulse" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Live Registrations</p>
                <p className="text-lg font-semibold">{formatIndianNumber(live_count)} ⚡</p>
              </div>
            </div>
          )}
        </div>

        {data_source && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-start gap-2 pt-2 border-t">
                  <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Data from: {data_source}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{data_source}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {competitionLevel === "high" && ratio && (
          <Alert className="bg-destructive/10 border-destructive/20">
            <Flame className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-sm">High Competition!</AlertTitle>
            <AlertDescription className="text-xs">
              This program is very popular. Set reminders to apply early.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ApplicationStatsDisplay;
