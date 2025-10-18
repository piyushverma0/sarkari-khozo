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
      className="relative rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 group w-full aspect-square bg-card/50 border border-border/30 hover:border-primary/40 hover:bg-card/70 backdrop-blur-sm"
    >
      <Icon className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
      <span className="text-sm font-medium text-foreground text-center leading-tight group-hover:text-primary transition-colors">{title}</span>
    </button>
  );
};

export default CategoryCard;
