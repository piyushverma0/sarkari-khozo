import SavedApplicationCard from "./SavedApplicationCard";

interface SavedApplicationsSectionProps {
  userId: string;
}

// Mock data for demonstration
const mockApplications = [
  {
    id: "1",
    title: "Bihar Staff Selection Commission (BSSC) Application",
    description: "The Bihar Staff Selection Commission (BSSC) conducts various recruitment examinations for different departments und...",
    savedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    id: "2",
    title: "Combined Higher Secondary (10+2) Level Examination, 2024",
    description: "Combined Higher Secondary examination conducted by SSC for various government positions requiring 10+2 qualification...",
    savedAt: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23 hours ago
  },
  {
    id: "3",
    title: "Kisan Credit Card (KCC) Scheme",
    description: "The Kisan Credit Card (KCC) scheme aims at providing adequate and timely credit support from the banking system to th...",
    savedAt: new Date(Date.now() - 22 * 60 * 60 * 1000), // 22 hours ago
  },
  {
    id: "4",
    title: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    description: "Pradhan Mantri Fasal Bima Yojana (PMFBY) is the flagship scheme of the Government of India for crop insurance,...",
    savedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
];

const SavedApplicationsSection = ({ userId }: SavedApplicationsSectionProps) => {
  return (
    <section className="py-16 px-4 bg-gradient-to-b from-transparent to-background/50">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl font-bold mb-8">Your Saved Applications</h2>
        
        <div className="space-y-4">
          {mockApplications.map((app) => (
            <SavedApplicationCard
              key={app.id}
              title={app.title}
              description={app.description}
              savedAt={app.savedAt}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SavedApplicationsSection;
