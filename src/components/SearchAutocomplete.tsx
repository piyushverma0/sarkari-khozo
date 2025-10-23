import { useState, useEffect } from "react";
import { Search, FileText, Briefcase, Target, Rocket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Suggestion {
  title: string;
  category: "Exam" | "Job" | "Scheme" | "Startup";
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}

const SUGGESTIONS: Suggestion[] = [
  { title: "SSC CGL 2024 Exam", category: "Exam" },
  { title: "SSC CHSL 2025", category: "Exam" },
  { title: "UPSC Civil Services Prelims", category: "Exam" },
  { title: "UPSC CAPF 2025", category: "Exam" },
  { title: "RRB NTPC 2025", category: "Exam" },
  { title: "RRB Group D", category: "Exam" },
  { title: "IBPS PO 2025", category: "Exam" },
  { title: "IBPS Clerk Exam", category: "Exam" },
  { title: "PM Kisan Yojana", category: "Scheme" },
  { title: "PM SVANidhi Scheme", category: "Scheme" },
  { title: "Startup India Seed Fund", category: "Startup" },
  { title: "Gujarat Startup Grant", category: "Startup" },
  { title: "Atal Innovation Mission", category: "Startup" },
  { title: "PMEGP Loan Scheme", category: "Scheme" },
  { title: "Mudra Loan Yojana", category: "Scheme" },
];

const getCategoryIcon = (category: Suggestion["category"]) => {
  switch (category) {
    case "Exam":
      return FileText;
    case "Job":
      return Briefcase;
    case "Scheme":
      return Target;
    case "Startup":
      return Rocket;
  }
};

const getCategoryColor = (category: Suggestion["category"]) => {
  switch (category) {
    case "Exam":
      return "bg-primary/10 text-primary border-primary/20";
    case "Job":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "Scheme":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "Startup":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  }
};


export const SearchAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder,
  disabled,
  className,
}: SearchAutocompleteProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (value.trim().length > 1) {
      const filtered = SUGGESTIONS.filter((suggestion) =>
        suggestion.title.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  }, [value]);

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="search-gradient-border">
        <div className="relative">
          <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-primary z-10 transition-all duration-300" />
          <Input
            placeholder={placeholder}
            className={cn(
              "pl-12 sm:pl-14 pr-4 h-14 sm:h-16 md:h-[64px] rounded-full text-sm sm:text-base bg-gradient-to-r from-background/90 to-background/80 backdrop-blur-xl border-0 focus-visible:ring-4 focus-visible:ring-primary/30 transition-all duration-300 shadow-lg focus-visible:shadow-primary/20",
              "placeholder:text-muted-foreground/60",
              className
            )}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => value.trim().length > 1 && filteredSuggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            disabled={disabled}
          />
        </div>
      </div>
      
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-3 z-[100] animate-slide-fade-in">
          <Command className="rounded-2xl border-2 border-primary/20 shadow-2xl bg-background/95 backdrop-blur-xl overflow-hidden">
            <CommandList className="max-h-[400px]">
              <CommandEmpty className="py-6 text-center text-muted-foreground">
                No suggestions found.
              </CommandEmpty>
              <CommandGroup heading="Suggestions" className="p-2">
                {filteredSuggestions.map((suggestion, index) => {
                  const Icon = getCategoryIcon(suggestion.category);
                  return (
                    <CommandItem
                      key={index}
                      onSelect={() => handleSelect(suggestion.title)}
                      className="cursor-pointer px-4 py-3 rounded-xl mb-1 transition-all duration-200 hover:bg-primary/10 hover:scale-[1.02] group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={cn(
                          "p-2 rounded-lg transition-all duration-200 group-hover:scale-110",
                          getCategoryColor(suggestion.category)
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {suggestion.title}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs font-medium border transition-all duration-200",
                            getCategoryColor(suggestion.category)
                          )}
                        >
                          {suggestion.category}
                        </Badge>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};
