import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Building2, FileText, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import StartupIntentDialog from "@/components/StartupIntentDialog";
import StartupProgramsList from "@/components/StartupProgramsList";

type IntentType = "funding" | "incubation" | "policy" | "explore" | null;

interface Program {
  id?: string;
  title: string;
  description: string;
  url?: string;
  program_type?: string;
  funding_amount?: string;
  sector?: string;
  stage?: string;
  state_specific?: string;
  success_rate?: string;
  dpiit_required?: boolean;
  important_dates?: any;
  eligibility?: string;
  documents_required?: any;
}

const StartupCategory = () => {
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
    // Reopen the last selected intent dialog or show all intents
  };

  const intentButtons = [
    {
      type: "funding" as IntentType,
      icon: DollarSign,
      title: "Find Funding",
      description: "Discover grants, seed funding, and investment programs",
      gradient: "from-teal-500/20 to-cyan-500/20",
    },
    {
      type: "incubation" as IntentType,
      icon: Building2,
      title: "Find Incubation / Accelerator",
      description: "Access top incubators and accelerator programs",
      gradient: "from-purple-500/20 to-pink-500/20",
    },
    {
      type: "policy" as IntentType,
      icon: FileText,
      title: "Find Policy Benefits",
      description: "Explore tax benefits and compliance support",
      gradient: "from-blue-500/20 to-indigo-500/20",
    },
    {
      type: "explore" as IntentType,
      icon: Globe,
      title: "Explore All Opportunities",
      description: "View all startup programs and schemes",
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
                <h1 className="text-4xl font-bold mb-3">For Startups</h1>
                <p className="text-lg text-muted-foreground">
                  Find funding, incubation programs, and government support for your startup
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
            <StartupProgramsList
              programs={programs}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onModifySearch={handleModifySearch}
            />
          )}
        </div>
      </main>

      {/* Intent Dialog */}
      <StartupIntentDialog
        open={selectedIntent !== null}
        onOpenChange={(open) => !open && setSelectedIntent(null)}
        intentType={selectedIntent}
        onComplete={handleIntentComplete}
      />
    </div>
  );
};

export default StartupCategory;
