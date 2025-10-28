import { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pull-to-Refresh Component for Mobile
 * 
 * iOS-style pull-to-refresh interaction
 */

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  disabled?: boolean;
  className?: string;
}

export const PullToRefresh = ({
  onRefresh,
  children,
  threshold = 80,
  disabled = false,
  className,
}: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [canPull, setCanPull] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;

    const container = containerRef.current;
    if (!container) return;

    // Only allow pull if scrolled to top
    if (container.scrollTop === 0) {
      setCanPull(true);
      setStartY(e.touches[0].clientY);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!canPull || disabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0) {
      // Apply resistance - harder to pull as distance increases
      const resistance = Math.min(distance / 2, threshold * 1.5);
      setPullDistance(resistance);

      // Prevent default scrolling when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [canPull, disabled, isRefreshing, startY, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!canPull || disabled) return;

    setCanPull(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [canPull, disabled, pullDistance, threshold, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Pull Indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-10"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 0 ? 1 : 0,
        }}
      >
        <div className="flex flex-col items-center gap-2 py-4">
          <div
            className={cn(
              'transition-all duration-200',
              {
                'animate-spin': isRefreshing,
              }
            )}
            style={{
              transform: `rotate(${progress * 360}deg)`,
            }}
          >
            <RefreshCw
              className={cn('w-6 h-6 transition-colors', {
                'text-primary': shouldTrigger || isRefreshing,
                'text-muted-foreground': !shouldTrigger && !isRefreshing,
              })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {isRefreshing
              ? 'Refreshing...'
              : shouldTrigger
              ? 'Release to refresh'
              : 'Pull to refresh'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        className="overflow-auto h-full"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: canPull ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
