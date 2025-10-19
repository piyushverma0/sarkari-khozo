import { cn } from "@/lib/utils";

interface SakhiAvatarProps {
  isActive: boolean;
  className?: string;
}

export const SakhiAvatar = ({ isActive, className }: SakhiAvatarProps) => {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer glow ring */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-500",
          isActive 
            ? "bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse scale-110" 
            : "bg-muted/30 scale-100"
        )}
      />
      
      {/* Inner circle */}
      <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
        {/* Sakhi text/icon */}
        <span className="text-2xl font-bold text-primary-foreground">
          S
        </span>
      </div>

      {/* Active indicator dot */}
      {isActive && (
        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background animate-pulse" />
      )}
    </div>
  );
};
