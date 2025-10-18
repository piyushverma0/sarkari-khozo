import { LucideIcon } from "lucide-react";
import { useState } from "react";

interface CategoryCardProps {
  icon: LucideIcon;
  title: string;
  onClick?: () => void;
}

const CategoryCard = ({ icon: Icon, title, onClick }: CategoryCardProps) => {
  const [isShining, setIsShining] = useState(false);

  const handleClick = () => {
    setIsShining(true);
    setTimeout(() => setIsShining(false), 600);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={`relative rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-all duration-500 group w-full aspect-square bg-card/50 backdrop-blur-sm overflow-hidden
        ${isShining 
          ? 'border-2 border-primary shadow-[0_0_20px_rgba(134,182,246,0.6)] animate-pulse' 
          : 'border border-border/30 hover:border-primary/40'
        } hover:bg-card/70`}
    >
      {isShining && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-[shimmer_0.6s_ease-in-out]" 
             style={{
               backgroundSize: '200% 100%',
               animation: 'shimmer 0.6s ease-in-out'
             }} 
        />
      )}
      <Icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-300 relative z-10" strokeWidth={1.5} />
      <span className="text-sm font-medium text-foreground text-center leading-tight group-hover:text-primary transition-colors relative z-10">{title}</span>
    </button>
  );
};

export default CategoryCard;
