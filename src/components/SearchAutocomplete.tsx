import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
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
          "pl-10 sm:pl-12 h-12 sm:h-14 md:h-16 rounded-full text-sm sm:text-base bg-background/80 border-0 focus-visible:ring-2 focus-visible:ring-primary transition-all duration-200",
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
                {filteredSuggestions.map((suggestion, index) => (
                  <CommandItem
                    key={index}
                    onSelect={() => handleSelect(suggestion.title)}
                    className="cursor-pointer text-left justify-start"
                  >
                    {suggestion.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};
