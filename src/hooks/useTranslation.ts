import { useState, useEffect, useCallback } from 'react';
import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { getLanguageDirection, isRTL } from '@/i18n/config';

type Language = 'en' | 'hi' | 'kn' | 'bh';

interface TranslationCache {
  [key: string]: {
    [lang: string]: string;
  };
}

export const useTranslation = () => {
  const { t, i18n } = useI18nextTranslation();
  const [translationCache, setTranslationCache] = useState<TranslationCache>({});
  const [isTranslating, setIsTranslating] = useState(false);
  
  const currentLanguage = i18n.language as Language;

  // Update document direction when language changes
  useEffect(() => {
    const direction = getLanguageDirection(currentLanguage);
    document.documentElement.dir = direction;
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

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

  const changeLanguage = useCallback(async (lang: Language) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem('preferred_language', lang);
  }, [i18n]);

  const getLanguageLabel = (lang: Language): string => {
    switch (lang) {
      case 'en': return 'English';
      case 'hi': return 'हिंदी';
      case 'kn': return 'ಕನ್ನಡ';
      case 'bh': return 'भोजपुरी';
      default: return 'English';
    }
  };

  return {
    currentLanguage,
    changeLanguage,
    translateText,
    isTranslating,
    getLanguageLabel,
    t, // i18next translation function
    i18n, // i18next instance
    isRTL: isRTL(currentLanguage),
    direction: getLanguageDirection(currentLanguage),
  };
};
