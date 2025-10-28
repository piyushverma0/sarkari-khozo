import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import hiTranslations from './locales/hi.json';
import knTranslations from './locales/kn.json';
import bhTranslations from './locales/bh.json';

// Language resources
const resources = {
  en: {
    translation: enTranslations,
  },
  hi: {
    translation: hiTranslations,
  },
  kn: {
    translation: knTranslations,
  },
  bh: {
    translation: bhTranslations,
  },
};

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'en',
    lng: localStorage.getItem('preferred_language') || 'en',
    debug: import.meta.env.DEV,
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferred_language',
    },
    
    // Return null for missing keys (allows fallback to AI translation)
    returnNull: false,
    returnEmptyString: false,
    
    // Support for RTL languages
    supportedLngs: ['en', 'hi', 'kn', 'bh'],
    
    // Namespace configuration
    defaultNS: 'translation',
    
    react: {
      useSuspense: false, // Don't suspend on missing translations
    },
  });

export default i18n;

// Helper to get text direction for a language
export const getLanguageDirection = (lang: string): 'ltr' | 'rtl' => {
  // Currently all supported languages are LTR
  // Add 'ar', 'ur', 'he' etc. to this array when adding RTL languages
  const rtlLanguages = ['ar', 'ur', 'he', 'fa'];
  return rtlLanguages.includes(lang) ? 'rtl' : 'ltr';
};

// Helper to check if language is RTL
export const isRTL = (lang: string): boolean => {
  return getLanguageDirection(lang) === 'rtl';
};
