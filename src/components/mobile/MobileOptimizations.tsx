import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Mobile-specific optimizations and utilities
 */

// Touch-optimized Button (ensures 44x44px minimum)
interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  minSize?: number;
}

export const TouchButton = ({
  children,
  className,
  minSize = 44,
  ...props
}: TouchButtonProps) => {
  return (
    <button
      {...props}
      className={cn('inline-flex items-center justify-center', className)}
      style={{
        minWidth: `${minSize}px`,
        minHeight: `${minSize}px`,
        ...props.style,
      }}
    >
      {children}
    </button>
  );
};

// Mobile-optimized Input (larger touch targets)
interface TouchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  minHeight?: number;
}

export const TouchInput = ({ className, minHeight = 44, ...props }: TouchInputProps) => {
  return (
    <input
      {...props}
      className={cn('w-full px-4', className)}
      style={{
        minHeight: `${minHeight}px`,
        fontSize: '16px', // Prevents iOS zoom on focus
        ...props.style,
      }}
    />
  );
};

// Prevent iOS zoom on input focus
export const usePreventZoom = () => {
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventZoom);
    };
  }, []);
};

// Detect mobile device
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Safe area insets (for iPhone notch, etc.)
export const SafeAreaView = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(className)}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
      }}
    >
      {children}
    </div>
  );
};

// Haptic Feedback (Vibration API)
export const useHapticFeedback = () => {
  const vibrate = (pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return {
    light: () => vibrate(10),
    medium: () => vibrate(20),
    heavy: () => vibrate(30),
    success: () => vibrate([10, 50, 10]),
    error: () => vibrate([50, 100, 50]),
    pattern: vibrate,
  };
};

// Improved Mobile Navigation
interface MobileTabBarProps {
  items: Array<{
    icon: React.ReactNode;
    label: string;
    href: string;
    badge?: number;
  }>;
  activeIndex: number;
  onItemClick: (index: number) => void;
}

export const MobileTabBar = ({ items, activeIndex, onItemClick }: MobileTabBarProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-40">
      <SafeAreaView>
        <div className="flex items-center justify-around h-16">
          {items.map((item, index) => (
            <TouchButton
              key={index}
              onClick={() => onItemClick(index)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 transition-colors',
                {
                  'text-primary': activeIndex === index,
                  'text-muted-foreground': activeIndex !== index,
                }
              )}
            >
              <div className="relative">
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </TouchButton>
          ))}
        </div>
      </SafeAreaView>
    </nav>
  );
};

// Swipeable Card (for dismissible items)
interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  className?: string;
}

export const SwipeableCard = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  className,
}: SwipeableCardProps) => {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const distance = currentX - startX;

    if (distance > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (distance < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }

    setStartX(0);
    setCurrentX(0);
  };

  const offset = isDragging ? currentX - startX : 0;

  return (
    <div
      className={cn('transition-transform', className)}
      style={{
        transform: `translateX(${offset}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};
