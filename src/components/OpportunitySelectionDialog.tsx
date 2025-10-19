import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Search, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Opportunity {
  title: string;
  description: string;
  application_status: string;
  deadline: string;
  category: string;
  url?: string;
}

interface OpportunitySelectionDialogProps {
  isOpen: boolean;
  organizationName: string;
  activeOpportunities: Opportunity[];
  expiredOpportunities: Opportunity[];
  onSelect: (opportunity: Opportunity) => void;
  onClose: () => void;
}

export const OpportunitySelectionDialog = ({
  isOpen,
  organizationName,
  activeOpportunities,
  expiredOpportunities,
  onSelect,
  onClose,
}: OpportunitySelectionDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  const filterOpportunities = (opportunities: Opportunity[]) => {
    if (!searchQuery.trim()) return opportunities;
    const query = searchQuery.toLowerCase();
    return opportunities.filter(
      (opp) =>
        opp.title.toLowerCase().includes(query) ||
        opp.description.toLowerCase().includes(query) ||
        opp.category.toLowerCase().includes(query)
    );
  };

  const filteredActive = filterOpportunities(activeOpportunities);
  const filteredExpired = filterOpportunities(expiredOpportunities);

  const OpportunityCard = ({ opportunity, isActive }: { opportunity: Opportunity; isActive: boolean }) => (
    <Card 
      className={`glass-card transition-all duration-200 hover:shadow-lg ${
        isActive 
          ? 'border-green-500/30 bg-green-500/5' 
          : 'border-border/50 bg-muted/20 opacity-75'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-tight">
            {opportunity.title}
          </CardTitle>
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className={isActive ? "bg-green-500 hover:bg-green-600" : "bg-muted"}
          >
            {opportunity.application_status}
          </Badge>
        </div>
        <CardDescription className="text-sm mt-1">
          {opportunity.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className={isActive ? "text-foreground font-medium" : "text-muted-foreground"}>
            Deadline: {opportunity.deadline}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="text-xs">
            {opportunity.category}
          </Badge>
        </div>

        <div className="flex gap-2 pt-2">
          {isActive && (
            <Button
              onClick={() => onSelect(opportunity)}
              className="flex-1 bg-primary hover:bg-primary/90"
              size="sm"
            >
              Track This
            </Button>
          )}
          {opportunity.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(opportunity.url, '_blank')}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl font-bold">
            Select from {organizationName} Opportunities
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            We found multiple opportunities. Please select the one you want to track.
          </DialogDescription>
          
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="relative">
              Active Opportunities
              {activeOpportunities.length > 0 && (
                <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white">
                  {activeOpportunities.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expired" className="relative">
              Past Opportunities
              {expiredOpportunities.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {expiredOpportunities.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[50vh] mt-4 pr-4">
            <TabsContent value="active" className="mt-0">
              {filteredActive.length > 0 ? (
                <div className="grid gap-4 pb-4">
                  {filteredActive.map((opportunity, index) => (
                    <OpportunityCard key={index} opportunity={opportunity} isActive={true} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery ? "No matching active opportunities found." : "No active opportunities available."}
                </div>
              )}
            </TabsContent>

            <TabsContent value="expired" className="mt-0">
              {filteredExpired.length > 0 ? (
                <div className="grid gap-4 pb-4">
                  {filteredExpired.map((opportunity, index) => (
                    <OpportunityCard key={index} opportunity={opportunity} isActive={false} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery ? "No matching past opportunities found." : "No past opportunities available."}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
