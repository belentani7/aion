import React from 'react';
import { useI18n } from '../contexts/I18nContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Globe } from 'lucide-react';
import { Language } from '../i18n';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, availableLanguages } = useI18n();

  return (
    <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
      <SelectTrigger className="w-[140px] bg-slate-900 border-slate-800 text-slate-200 h-9 text-xs">
        <div className="flex items-center gap-2 truncate">
          <Globe className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <SelectValue placeholder="Idioma" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-slate-950 border-slate-800 text-slate-100">
        {availableLanguages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="text-xs">
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
