import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Language = 'en' | 'hi' | 'kn';

interface TranslationCache {
  [key: string]: {
    [lang: string]: string;
  };
}

export const useTranslation = () => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [translationCache, setTranslationCache] = useState<TranslationCache>({});
  const [isTranslating, setIsTranslating] = useState(false);

  // Load language preference from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_language') as Language;
    if (savedLang && ['en', 'hi', 'kn'].includes(savedLang)) {
      setCurrentLanguage(savedLang);
    }
  }, []);

  const translateText = useCallback(async (text: string, targetLang: Language): Promise<string> => {
    // Return original text for English
    if (targetLang === 'en') {
      return text;
    }

    // Check cache first
    const cacheKey = text.substring(0, 100); // Use first 100 chars as key
    if (translationCache[cacheKey]?.[targetLang]) {
      return translationCache[cacheKey][targetLang];
    }

    setIsTranslating(true);

    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: { text, targetLanguage: targetLang }
      });

      if (error) throw error;

      const translatedText = data.translatedText;

      // Update cache
      setTranslationCache(prev => ({
        ...prev,
        [cacheKey]: {
          ...prev[cacheKey],
          [targetLang]: translatedText
        }
      }));

      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      // Return original text on error
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [translationCache]);

  const changeLanguage = useCallback((lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem('preferred_language', lang);
  }, []);

  const getLanguageLabel = (lang: Language): string => {
    switch (lang) {
      case 'en': return 'English';
      case 'hi': return 'हिंदी';
      case 'kn': return 'ಕನ್ನಡ';
      default: return 'English';
    }
  };

  return {
    currentLanguage,
    changeLanguage,
    translateText,
    isTranslating,
    getLanguageLabel,
  };
};
