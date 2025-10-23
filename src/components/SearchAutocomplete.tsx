import { useState, useEffect } from "react";
import { Search, FileText, Briefcase, Target, Rocket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
      return "bg-[hsl(var(--primary))] text-primary-foreground";
    case "Job":
      return "bg-blue-500 text-white";
    case "Scheme":
      return "bg-[hsl(var(--chart-2))] text-white";
    case "Startup":
      return "bg-purple-500 text-white";
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
      <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground z-10" />
      <Input
        placeholder={placeholder}
        className={cn(
          "pl-10 sm:pl-12 h-12 sm:h-14 md:h-16 rounded-full text-sm sm:text-base bg-background/80 border-0 focus-visible:ring-2 focus-visible:ring-primary shadow-sm transition-all duration-200",
          className
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.trim().length > 1 && filteredSuggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        disabled={disabled}
      />
      
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-3 z-50">
          <Command className="rounded-xl border border-border/50 shadow-lg bg-popover/95 backdrop-blur-sm">
            <CommandList className="max-h-[300px]">
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                No suggestions found.
              </CommandEmpty>
              <CommandGroup heading="Suggestions" className="p-2">
                {filteredSuggestions.map((suggestion, index) => {
                  const Icon = getCategoryIcon(suggestion.category);
                  return (
                    <CommandItem
                      key={index}
                      onSelect={() => handleSelect(suggestion.title)}
                      className="cursor-pointer flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent/50 transition-colors duration-150 group"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent/30 group-hover:bg-accent/50 transition-colors">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {suggestion.title}
                        </p>
                      </div>
                      <Badge 
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-md",
                          getCategoryColor(suggestion.category)
                        )}
                        variant="secondary"
                      >
                        {suggestion.category}
                      </Badge>
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
