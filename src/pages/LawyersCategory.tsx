import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Scale, GraduationCap, Briefcase, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import LawyerIntentDialog from "@/components/LawyerIntentDialog";
import LawyerProgramsList from "@/components/LawyerProgramsList";

type IntentType = "judiciary" | "fellowships" | "internships" | "schemes" | null;

interface Program {
  id?: string;
  title: string;
  description: string;
  url?: string;
  program_type?: string;
  funding_amount?: string;
  eligibility?: string;
  duration?: string;
  location?: string;
  documents_required?: any;
  important_dates?: any;
  application_process?: string;
}

const LawyersCategory = () => {
  const navigate = useNavigate();
  const [selectedIntent, setSelectedIntent] = useState<IntentType>(null);
  const [showResults, setShowResults] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleIntentComplete = (foundPrograms: Program[], query: string) => {
    setPrograms(foundPrograms);
    setSearchQuery(query);
    setShowResults(true);
    setSelectedIntent(null);
  };

  const handleModifySearch = () => {
    setShowResults(false);
  };

  const intentButtons = [
    {
      type: "judiciary" as IntentType,
      icon: Scale,
      title: "Judiciary Exams",
      description: "Find judicial service exams and notifications",
      gradient: "from-blue-500/20 to-indigo-500/20",
    },
    {
      type: "fellowships" as IntentType,
      icon: GraduationCap,
      title: "Legal Fellowships",
      description: "Discover fellowships and research opportunities",
      gradient: "from-purple-500/20 to-pink-500/20",
    },
    {
      type: "internships" as IntentType,
      icon: Briefcase,
      title: "Internships & Clerkships",
      description: "Access internships at courts and law firms",
      gradient: "from-teal-500/20 to-cyan-500/20",
    },
    {
      type: "schemes" as IntentType,
      icon: FileText,
      title: "Legal Aid & Schemes",
      description: "Explore government legal aid programs",
      gradient: "from-orange-500/20 to-amber-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          {!showResults ? (
            <>
              {/* Hero Section */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-3">Lawyers & Legal Professionals</h1>
                <p className="text-lg text-muted-foreground">
                  Discover judiciary exams, fellowships, and government schemes designed for legal professionals
                </p>
              </div>

              {/* Intent Buttons Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {intentButtons.map((intent) => {
                  const Icon = intent.icon;
                  return (
                    <Card
                      key={intent.type}
                      className="hover-scale cursor-pointer"
                      onClick={() => setSelectedIntent(intent.type)}
                    >
                      <CardContent className="flex items-start gap-4 p-6">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2">{intent.title}</h3>
                          <p className="text-sm text-muted-foreground">{intent.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            /* Results View */
            <LawyerProgramsList
              programs={programs}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onModifySearch={handleModifySearch}
            />
          )}
        </div>
      </main>

      {/* Intent Dialog */}
      <LawyerIntentDialog
        open={selectedIntent !== null}
        onOpenChange={(open) => !open && setSelectedIntent(null)}
        intentType={selectedIntent}
        onComplete={handleIntentComplete}
      />
    </div>
  );
};

export default LawyersCategory;
