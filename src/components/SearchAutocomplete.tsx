import { useState, useEffect } from "react";
import { Search } from "lucide-react";
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

const categoryConfig = {
  Exam: { emoji: "📝", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" },
  Job: { emoji: "💼", color: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20" },
  Scheme: { emoji: "🌱", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20" },
  Startup: { emoji: "🚀", color: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20" },
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
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
      <Input
        placeholder={placeholder}
        className={cn(
          "pl-12 h-14 text-base bg-background/80 border-2 border-primary/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary/50 transition-all duration-200",
          className
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.trim().length > 1 && filteredSuggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        disabled={disabled}
      />
      
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <Command className="rounded-lg border shadow-md bg-popover">
            <CommandList>
              <CommandEmpty>No suggestions found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                {filteredSuggestions.map((suggestion, index) => {
                  const config = categoryConfig[suggestion.category];
                  return (
                    <CommandItem
                      key={index}
                      onSelect={() => handleSelect(suggestion.title)}
                      className="flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="flex-1">{suggestion.title}</span>
                      <Badge variant="outline" className={cn("text-xs", config.color)}>
                        {config.emoji} {suggestion.category}
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
