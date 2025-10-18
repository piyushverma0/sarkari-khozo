import { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  icon: LucideIcon;
  title: string;
  onClick?: () => void;
}

const CategoryCard = ({ icon: Icon, title, onClick }: CategoryCardProps) => {
  return (
    <button
      onClick={onClick}
      className="glass-card rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:shadow-[var(--shadow-glow)] transition-all duration-300 group min-h-[140px]"
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <span className="text-sm font-medium text-foreground">{title}</span>
    </button>
  );
};

export default CategoryCard;
