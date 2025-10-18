import { Globe, Volume2, Loader2, Pause, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type Language = 'en' | 'hi' | 'kn';

interface LanguageToolbarProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isGeneratingSummary: boolean;
  onPlayFullSummary: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  getLanguageLabel: (lang: Language) => string;
}

const LanguageToolbar = ({
  currentLanguage,
  onLanguageChange,
  isSpeaking,
  isPaused,
  isGeneratingSummary,
  onPlayFullSummary,
  onPause,
  onResume,
  onStop,
  getLanguageLabel,
}: LanguageToolbarProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-muted-foreground" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {getLanguageLabel(currentLanguage)}
              <span className="text-xs text-muted-foreground">▼</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onLanguageChange('en')}>
              <span className="flex items-center justify-between w-full">
                English
                {currentLanguage === 'en' && <Badge variant="secondary" className="ml-2">✓</Badge>}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLanguageChange('hi')}>
              <span className="flex items-center justify-between w-full">
                हिंदी (Hindi)
                {currentLanguage === 'hi' && <Badge variant="secondary" className="ml-2">✓</Badge>}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLanguageChange('kn')}>
              <span className="flex items-center justify-between w-full">
                ಕನ್ನಡ (Kannada)
                {currentLanguage === 'kn' && <Badge variant="secondary" className="ml-2">✓</Badge>}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
        {isGeneratingSummary ? (
          <Button variant="secondary" size="sm" disabled className="gap-2 flex-1 sm:flex-initial">
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing summary...
          </Button>
        ) : !isSpeaking && !isPaused ? (
          <Button variant="default" size="sm" onClick={onPlayFullSummary} className="gap-2 flex-1 sm:flex-initial">
            <Volume2 className="w-4 h-4" />
            Listen to Full Summary
          </Button>
        ) : (
          <>
            {isPaused ? (
              <Button variant="secondary" size="sm" onClick={onResume} className="gap-2">
                <Volume2 className="w-4 h-4" />
                Resume
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={onPause} className="gap-2">
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={onStop} className="gap-2">
              <StopCircle className="w-4 h-4" />
              Stop
            </Button>
            {isSpeaking && !isPaused && (
              <Badge variant="secondary" className="gap-1 ml-2 hidden sm:flex">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Playing
              </Badge>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LanguageToolbar;
