import { GraduationCap, Sprout, Users, Heart, Baby, Briefcase } from "lucide-react";
import CategoryCard from "./CategoryCard";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

const categories = [
  { icon: GraduationCap, title: "Students" },
  { icon: Sprout, title: "Farmers" },
  { icon: Users, title: "Senior Citizens" },
  { icon: Heart, title: "Health & Insurance" },
  { icon: Baby, title: "Women & Children" },
  { icon: Briefcase, title: "Jobs" },
];

interface CategoriesSectionProps {
  user: User | null;
  onAuthRequired: () => void;
}

const CategoriesSection = ({ user, onAuthRequired }: CategoriesSectionProps) => {
  const { toast } = useToast();

  const handleCategoryClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to explore categories.",
      });
      onAuthRequired();
    }
  };

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold text-center mb-12">
          Or Explore Categories
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => (
            <div key={index} onClick={!user ? handleCategoryClick : undefined}>
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
