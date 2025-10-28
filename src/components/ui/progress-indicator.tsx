import { useState, useEffect } from 'react';
import { Check, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * Multi-step Progress Indicator Components
 */

export interface Step {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

export const StepProgress = ({
  steps,
  currentStep,
  variant = 'horizontal',
  className,
}: StepProgressProps) => {
  if (variant === 'vertical') {
    return <VerticalStepProgress steps={steps} currentStep={currentStep} className={className} />;
  }

  return <HorizontalStepProgress steps={steps} currentStep={currentStep} className={className} />;
};

// Horizontal Step Progress
const HorizontalStepProgress = ({ steps, currentStep, className }: StepProgressProps) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                    {
                      'bg-primary border-primary text-primary-foreground': isCompleted || isCurrent,
                      'bg-background border-muted-foreground/30 text-muted-foreground':
                        !isCompleted && !isCurrent,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.icon || <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-2 text-center max-w-[120px]">
                  <p
                    className={cn('text-sm font-medium', {
                      'text-foreground': isCurrent,
                      'text-muted-foreground': !isCurrent,
                    })}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={cn('h-0.5 flex-1 -mt-8 mx-2', {
                    'bg-primary': isCompleted,
                    'bg-muted-foreground/30': !isCompleted,
                  })}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Vertical Step Progress
const VerticalStepProgress = ({ steps, currentStep, className }: StepProgressProps) => {
  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              {/* Step Circle */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0',
                  {
                    'bg-primary border-primary text-primary-foreground': isCompleted || isCurrent,
                    'bg-background border-muted-foreground/30 text-muted-foreground':
                      !isCompleted && !isCurrent,
                  }
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.icon || <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={cn('w-0.5 flex-1 mt-2', {
                    'bg-primary': isCompleted,
                    'bg-muted-foreground/30': !isCompleted,
                  })}
                  style={{ minHeight: '40px' }}
                />
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 pb-8">
              <h4
                className={cn('font-medium', {
                  'text-foreground': isCurrent,
                  'text-muted-foreground': !isCurrent,
                })}
              >
                {step.title}
              </h4>
              {step.description && (
                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Linear Progress with Percentage
interface LinearProgressProps {
  value: number;
  max?: number;
  showPercentage?: boolean;
  label?: string;
  className?: string;
}

export const LinearProgress = ({
  value,
  max = 100,
  showPercentage = true,
  label,
  className,
}: LinearProgressProps) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn('space-y-2', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium">{label}</span>}
          {showPercentage && <span className="text-muted-foreground">{Math.round(percentage)}%</span>}
        </div>
      )}
      <Progress value={percentage} />
    </div>
  );
};

// Circular Progress
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  className?: string;
}

export const CircularProgress = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  className,
}: CircularProgressProps) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-300"
          strokeLinecap="round"
        />
      </svg>
      {showPercentage && (
        <span className="absolute text-2xl font-bold">{Math.round(percentage)}%</span>
      )}
    </div>
  );
};

// Animated Loading Bar (for streaming content)
interface LoadingBarProps {
  isLoading: boolean;
  className?: string;
}

export const LoadingBar = ({ isLoading, className }: LoadingBarProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }

    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 h-1 bg-primary transition-all duration-300 z-50',
        {
          'opacity-0': !isLoading && progress === 100,
          'opacity-100': isLoading || progress < 100,
        },
        className
      )}
      style={{ width: `${progress}%` }}
    />
  );
};

// Upload Progress with File Info
interface UploadProgressProps {
  fileName: string;
  fileSize: number;
  uploadedSize: number;
  onCancel?: () => void;
}

export const UploadProgress = ({
  fileName,
  fileSize,
  uploadedSize,
  onCancel,
}: UploadProgressProps) => {
  const percentage = (uploadedSize / fileSize) * 100;
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            {formatSize(uploadedSize)} / {formatSize(fileSize)}
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="ml-2 text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>
      <Progress value={percentage} />
    </div>
  );
};

export default StepProgress;
