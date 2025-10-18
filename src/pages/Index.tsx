import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import SavedApplicationsSection from "@/components/SavedApplicationsSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <CategoriesSection />
        <SavedApplicationsSection />
      </main>
    </div>
  );
};

export default Index;
