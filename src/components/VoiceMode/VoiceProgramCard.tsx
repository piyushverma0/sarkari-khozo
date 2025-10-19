import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Save, Calendar } from "lucide-react";

interface VoiceProgramCardProps {
  program: any;
  index: number;
  onSave?: () => void;
  onRemind?: () => void;
}

export const VoiceProgramCard = ({ program, index, onSave, onRemind }: VoiceProgramCardProps) => {
  return (
    <Card className="w-full animate-fade-in">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                {index + 1}
              </Badge>
              {program.category && (
                <Badge variant="outline" className="text-xs">
                  {program.category}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{program.title}</CardTitle>
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {program.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Key info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {program.funding_amount && (
              <div>
                <span className="text-muted-foreground">Funding:</span>
                <p className="font-medium">{program.funding_amount}</p>
              </div>
            )}
            {program.state_specific && (
              <div>
                <span className="text-muted-foreground">State:</span>
                <p className="font-medium">{program.state_specific}</p>
              </div>
            )}
            {program.program_type && (
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium">{program.program_type}</p>
              </div>
            )}
            {program.stage && (
              <div>
                <span className="text-muted-foreground">Stage:</span>
                <p className="font-medium">{program.stage}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {onSave && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSave}
                className="gap-2"
              >
                <Save className="h-3 w-3" />
                Save
              </Button>
            )}
            {onRemind && program.important_dates && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRemind}
                className="gap-2"
              >
                <Calendar className="h-3 w-3" />
                Remind
              </Button>
            )}
            {program.url && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(program.url, '_blank')}
                className="gap-2 ml-auto"
              >
                <ExternalLink className="h-3 w-3" />
                View
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
