import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VoiceModeButtonProps {
  onClick: () => void;
  isActive: boolean;
  className?: string;
}

export const VoiceModeButton = ({ onClick, isActive, className }: VoiceModeButtonProps) => {
  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      <Button
        onClick={onClick}
        size="lg"
        className={cn(
          "h-16 w-16 rounded-full shadow-lg transition-all duration-300",
          "bg-primary hover:bg-primary/90",
          isActive && "animate-pulse shadow-primary/50"
        )}
        aria-label="Voice Mode"
      >
        <Mic className="h-7 w-7 text-primary-foreground" />
        {isActive && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center animate-pulse"
          >
            <span className="sr-only">Voice mode active</span>
          </Badge>
        )}
      </Button>
    </div>
  );
};
