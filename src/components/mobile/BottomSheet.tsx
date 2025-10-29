import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Mobile-optimized Bottom Sheet Component
 * 
 * Follows iOS/Android bottom sheet patterns with swipe gestures
 */

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  snapPoints?: number[]; // Percentage heights [50, 100]
  initialSnapPoint?: number;
  showHandle?: boolean;
  showClose?: boolean;
  className?: string;
}

export const BottomSheet = ({
  open,
  onOpenChange,
  children,
  title,
  description,
  snapPoints = [50, 100],
  initialSnapPoint = 0,
  showHandle = true,
  showClose = true,
  className,
}: BottomSheetProps) => {
  const [isVisible, setIsVisible] = useState(open);
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnapPoint);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setTimeout(() => setIsVisible(false), 300);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const dragDistance = currentY - startY;
    const threshold = 100; // Minimum drag distance to trigger snap

    if (dragDistance > threshold) {
      // Dragged down
      if (currentSnapIndex > 0) {
        setCurrentSnapIndex(currentSnapIndex - 1);
      } else {
        onOpenChange(false);
      }
    } else if (dragDistance < -threshold) {
      // Dragged up
      if (currentSnapIndex < snapPoints.length - 1) {
        setCurrentSnapIndex(currentSnapIndex + 1);
      }
    }

    setStartY(0);
    setCurrentY(0);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!isVisible) return null;

  const currentHeight = snapPoints[currentSnapIndex];
  const dragOffset = isDragging ? Math.max(0, currentY - startY) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity',
          {
            'opacity-100': open,
            'opacity-0': !open,
          }
        )}
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed left-0 right-0 bottom-0 z-50 bg-background rounded-t-[20px] shadow-2xl transition-transform',
          {
            'translate-y-0': open,
            'translate-y-full': !open,
          },
          className
        )}
        style={{
          height: `${currentHeight}%`,
          transform: `translateY(${open ? dragOffset : '100%'}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 bg-muted rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-4 pb-4 border-b">
            <div className="flex-1">
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {showClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-full px-4 py-4">{children}</div>
      </div>
    </>
  );
};

// Simple Bottom Sheet (No snap points, just open/close)
interface SimpleBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const SimpleBottomSheet = ({
  open,
  onOpenChange,
  children,
  title,
  className,
}: SimpleBottomSheetProps) => {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[90]}
      initialSnapPoint={0}
      title={title}
      className={className}
    >
      {children}
    </BottomSheet>
  );
};

export default BottomSheet;
