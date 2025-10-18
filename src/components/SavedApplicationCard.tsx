import { Calendar, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SavedApplicationCardProps {
  title: string;
  description: string;
  savedAt: Date;
  onClick?: () => void;
}

const SavedApplicationCard = ({ title, description, savedAt, onClick }: SavedApplicationCardProps) => {
  return (
    <button
      onClick={onClick}
      className="glass-card rounded-xl p-6 text-left hover:border-primary/50 hover:shadow-[var(--shadow-glow)] transition-all duration-300 group w-full"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>Saved {formatDistanceToNow(savedAt, { addSuffix: true })}</span>
          </div>
        </div>
        
        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>
    </button>
  );
};

export default SavedApplicationCard;
