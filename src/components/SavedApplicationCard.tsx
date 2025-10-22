import { useNavigate } from "react-router-dom";
import { Calendar, ArrowRight, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { getCompetitionLevel } from "@/utils/statsFormatting";

interface SavedApplicationCardProps {
  id: string;
  title: string;
  description: string;
  savedAt: Date;
  category?: string;
}

const SavedApplicationCard = ({ id, title, description, savedAt, category }: SavedApplicationCardProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data } = await supabase
          .from('scheme_stats')
          .select('competition_ratio, data_confidence, confidence_score')
          .eq('application_id', id)
          .order('year', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data && (data.data_confidence === 'verified' || (data.confidence_score && data.confidence_score > 0.7))) {
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };

    loadStats();
  }, [id]);

  const handleClick = () => {
    const categoryPath = category?.toLowerCase() || 'general';
    navigate(`/category/${categoryPath}/application/${id}`);
  };

  return (
    <button
      onClick={handleClick}
      className="glass-card rounded-xl p-4 sm:p-6 text-left hover:border-primary/50 hover:shadow-[var(--shadow-glow)] transition-all duration-300 group w-full"
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
            <span className="truncate">Saved {formatDistanceToNow(savedAt, { addSuffix: true })}</span>
          </div>
          
          {/* Competition indicator */}
          {stats?.competition_ratio && (
            <Badge 
              variant={getCompetitionLevel(stats.competition_ratio) === "high" ? "destructive" : "secondary"}
              className="text-xs mt-1"
            >
              <Flame className="w-3 h-3 mr-1" />
              {getCompetitionLevel(stats.competition_ratio) === "high" ? "High demand" : "Good odds"}
            </Badge>
          )}
        </div>
        
        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
      </div>
    </button>
  );
};

export default SavedApplicationCard;
