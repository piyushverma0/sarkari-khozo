import { Globe, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

type Language = 'en' | 'hi' | 'kn';

interface LanguageToolbarProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  isSpeaking: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  isAudioSupported: boolean;
  getLanguageLabel: (lang: Language) => string;
}

const LanguageToolbar = ({
  currentLanguage,
  onLanguageChange,
  isSpeaking,
  isPaused,
  onPause,
  onResume,
  onStop,
  isAudioSupported,
  getLanguageLabel,
}: LanguageToolbarProps) => {
  return (
    <div className="flex items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2 flex-1">
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

      {isAudioSupported && (
        <div className="flex items-center gap-1">
          {isSpeaking ? (
            <>
              {isPaused ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResume}
                  className="gap-2"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPause}
                  className="gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onStop}
              >
                <VolumeX className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Volume2 className="w-3 h-3" />
              Audio Ready
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default LanguageToolbar;
