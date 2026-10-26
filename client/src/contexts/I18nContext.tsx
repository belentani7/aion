import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, applyDocumentLocale, auditTranslations, extendedTranslations, uiMoreTranslations, uiTranslations, unitTranslations, validationTranslations, translations, languages } from '../i18n';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  availableLanguages: typeof languages;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Private browsing, SSR and privacy settings may deny storage access.
    try {
      const saved = typeof localStorage === 'undefined' ? null : localStorage.getItem('aion_lang');
      if (saved && Object.prototype.hasOwnProperty.call(translations, saved)) {
        return saved as Language;
      }
    } catch {
      // Keep the UI usable even when localStorage throws SecurityError.
    }
    return 'es';
  });

  const setLanguage = (lang: Language) => {
    if (!Object.prototype.hasOwnProperty.call(translations, lang)) return;
    setLanguageState(lang);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('aion_lang', lang);
    } catch {
      // Language is still changed in React state when persistence is blocked.
    }
    applyDocumentLocale(lang);
  };

  useEffect(() => {
    applyDocumentLocale(language);
  }, [language]);

  const t = (key: string): string => {
    const dict = { ...auditTranslations[language], ...unitTranslations[language], ...uiMoreTranslations[language], ...uiTranslations[language], ...validationTranslations[language], ...extendedTranslations[language], ...translations[language] };
    if (key in dict) {
      return dict[key];
    }
    const fallback = { ...auditTranslations.es, ...unitTranslations.es, ...uiMoreTranslations.es, ...uiTranslations.es, ...validationTranslations.es, ...extendedTranslations.es, ...translations.es };
    if (key in fallback) {
      return fallback[key];
    }
    return key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, availableLanguages: languages }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
