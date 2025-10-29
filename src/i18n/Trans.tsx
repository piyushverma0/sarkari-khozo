import { useTranslation } from 'react-i18next';
import { ReactNode } from 'react';

interface TransProps {
  i18nKey: string;
  values?: Record<string, string | number>;
  defaultValue?: string;
  children?: ReactNode;
}

/**
 * Trans component for translations with variable interpolation
 * 
 * @example
 * // Simple translation
 * <Trans i18nKey="common.loading" />
 * 
 * @example
 * // With variables
 * <Trans i18nKey="time.daysLeft" values={{ count: 5 }} />
 * 
 * @example
 * // With fallback
 * <Trans i18nKey="custom.text" defaultValue="Fallback text" />
 */
export const Trans = ({ i18nKey, values, defaultValue, children }: TransProps) => {
  const { t } = useTranslation();
  
  const translated = t(i18nKey, { ...values, defaultValue: defaultValue || children });
  
  return <>{translated}</>;
};

/**
 * Hook wrapper for easier access to translation function with type safety
 */
export const useT = () => {
  const { t } = useTranslation();
  
  return {
    t: (key: string, options?: any) => t(key, options),
    // Common translations
    common: {
      loading: () => t('common.loading'),
      error: () => t('common.error'),
      success: () => t('common.success'),
      save: () => t('common.save'),
      cancel: () => t('common.cancel'),
      submit: () => t('common.submit'),
      search: () => t('common.search'),
      close: () => t('common.close'),
    },
    auth: {
      signIn: () => t('auth.signIn'),
      signOut: () => t('auth.signOut'),
      signUp: () => t('auth.signUp'),
    },
    categories: {
      students: () => t('categories.students'),
      jobs: () => t('categories.jobs'),
      farmers: () => t('categories.farmers'),
      startups: () => t('categories.startups'),
    },
  };
};

export default Trans;
