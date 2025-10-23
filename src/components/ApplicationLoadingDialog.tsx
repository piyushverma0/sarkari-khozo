import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Search, FileText, Calendar, Sparkles, CheckCircle2 } from "lucide-react";
import { ApplicationCardSkeleton } from "@/components/SkeletonLoader";

interface ApplicationLoadingDialogProps {
  isOpen: boolean;
  stage: number;
  message: string;
  progress: number;
  onCancel: () => void;
  hasError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

const STAGE_ICONS = {
  1: Search,
  2: FileText,
  3: Calendar,
  4: Sparkles,
  5: CheckCircle2,
};

export const ApplicationLoadingDialog = ({
  isOpen,
  stage,
  message,
  progress,
  onCancel,
  hasError,
  errorMessage,
  onRetry,
}: ApplicationLoadingDialogProps) => {
  const IconComponent = STAGE_ICONS[stage as keyof typeof STAGE_ICONS] || Search;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent 
        className="max-w-2xl p-8 glass-card border-2 border-primary/20"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (progress > 50 && !hasError) {
            e.preventDefault();
          }
        }}
      >
        {/* Cancel Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 rounded-full"
          onClick={onCancel}
          disabled={progress > 50 && !hasError}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cancel</span>
        </Button>

        {/* Status Section */}
        <div className="space-y-6 mt-4">
          {/* Icon and Message */}
          <div className="flex items-center gap-4 animate-fade-in">
            <div className="flex-shrink-0">
              {hasError ? (
                <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <X className="w-6 h-6 text-destructive" />
                </div>
              ) : stage === 5 ? (
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center animate-scale-in">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-primary animate-pulse" />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">
                {hasError ? "Something went wrong" : message}
              </h2>
              {hasError && errorMessage && (
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {!hasError && (
            <div className="space-y-2">
              <Progress 
                value={progress} 
                className="h-3 bg-white/10"
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {progress < 100 ? "Hang on! We're finding your form." : "Ready!"}
                </p>
                <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
              </div>
            </div>
          )}

          {/* Skeleton Card Preview */}
          <div className={`transition-opacity duration-300 ${hasError ? 'opacity-30' : 'opacity-60'}`}>
            <ApplicationCardSkeleton />
          </div>

          {/* Error Actions */}
          {hasError && onRetry && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={onRetry}
                className="flex-1"
              >
                Try Again
              </Button>
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Slow Connection Message */}
          {!hasError && progress >= 95 && progress < 100 && (
            <p className="text-xs text-muted-foreground text-center animate-fade-in">
              Taking longer than usual... Please wait
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
