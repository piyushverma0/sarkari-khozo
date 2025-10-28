import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Standalone Language Switcher Component
 * Can be used anywhere in the app to switch languages
 * 
 * @example
 * import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';
 * 
 * <LanguageSwitcher />
 */
export const LanguageSwitcher = () => {
  const { currentLanguage, changeLanguage, getLanguageLabel } = useTranslation();

  const languages = [
    { code: 'en' as const, name: 'English' },
    { code: 'hi' as const, name: 'हिंदी (Hindi)' },
    { code: 'kn' as const, name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'bh' as const, name: 'भोजपुरी (Bhojpuri)' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{getLanguageLabel(currentLanguage)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
          >
            <span className="flex items-center justify-between w-full">
              {lang.name}
              {currentLanguage === lang.code && (
                <Badge variant="secondary" className="ml-2">
                  ✓
                </Badge>
              )}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
