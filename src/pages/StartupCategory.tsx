import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Building2, FileText, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import StartupIntentDialog from "@/components/StartupIntentDialog";

type IntentType = "funding" | "incubation" | "policy" | "explore" | null;

const StartupCategory = () => {
  const navigate = useNavigate();
  const [selectedIntent, setSelectedIntent] = useState<IntentType>(null);

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

          {/* Hero Section */}
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">
              Find Startup Funding, Incubation & Government Support
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Just tell us what your startup needs — our AI will match you with the best programs.
            </p>
          </div>

          {/* Intent Buttons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {intentButtons.map((intent) => {
              const Icon = intent.icon;
              return (
                <Card
                  key={intent.type}
                  className={`p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-lg bg-gradient-to-br ${intent.gradient} border-2 hover:border-primary/50`}
                  onClick={() => setSelectedIntent(intent.type)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{intent.title}</h3>
                      <p className="text-sm text-muted-foreground">{intent.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Additional Info */}
          <div className="mt-12 p-6 rounded-xl bg-muted/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-3">Why Choose FormVerse for Startups?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ <strong>AI-Powered Matching:</strong> Get personalized program recommendations</li>
              <li>✓ <strong>Comprehensive Database:</strong> Access programs from Startup India, DPIIT, State Missions & more</li>
              <li>✓ <strong>Track Applications:</strong> Never miss a deadline with smart reminders</li>
              <li>✓ <strong>Step-by-Step Guidance:</strong> Know exactly what documents and steps you need</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Intent Dialog */}
      <StartupIntentDialog
        open={selectedIntent !== null}
        onOpenChange={(open) => !open && setSelectedIntent(null)}
        intentType={selectedIntent}
      />
    </div>
  );
};

export default StartupCategory;
