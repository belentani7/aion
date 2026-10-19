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
    const saved = localStorage.getItem('aion_lang');
    if (saved && saved in translations) {
      return saved as Language;
    }
    return 'es';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('aion_lang', lang);
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
