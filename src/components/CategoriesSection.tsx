import { useNavigate } from "react-router-dom";
import { GraduationCap, Sprout, Users, Heart, Baby, Briefcase } from "lucide-react";
import CategoryCard from "./CategoryCard";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

const categories = [
  { icon: GraduationCap, title: "Students", slug: "students" },
  { icon: Sprout, title: "Farmers", slug: "farmers" },
  { icon: Users, title: "Senior Citizens", slug: "senior-citizens" },
  { icon: Heart, title: "Health & Insurance", slug: "health-insurance" },
  { icon: Baby, title: "Women & Children", slug: "women-children" },
  { icon: Briefcase, title: "Jobs", slug: "jobs" },
];

interface CategoriesSectionProps {
  user: User | null;
  onAuthRequired: () => void;
}

const CategoriesSection = ({ user, onAuthRequired }: CategoriesSectionProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCategoryClick = (slug: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to explore categories.",
      });
      onAuthRequired();
      return;
    }
    navigate(`/category/${slug}`);
  };

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold text-center mb-12">
          Or Explore Categories
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => (
            <div 
              key={index} 
              onClick={() => handleCategoryClick(category.slug)}
              className="cursor-pointer"
            >
              <CategoryCard
                icon={category.icon}
                title={category.title}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
