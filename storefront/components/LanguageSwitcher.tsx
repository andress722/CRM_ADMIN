import React from 'react';
import { useTranslation } from 'react-i18next';
import CountrySwitcher from './CountrySwitcher';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex gap-2 items-center bg-white/60 border border-slate-200 rounded-full p-1">
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${i18n.language === 'pt' ? 'bg-indigo-600 text-white shadow-glow' : 'text-slate-700'}`}
          onClick={() => i18n.changeLanguage('pt')}
        >
          PT
        </button>
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${i18n.language === 'en' ? 'bg-indigo-600 text-white shadow-glow' : 'text-slate-700'}`}
          onClick={() => i18n.changeLanguage('en')}
        >
          EN
        </button>
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${i18n.language === 'es' ? 'bg-indigo-600 text-white shadow-glow' : 'text-slate-700'}`}
          onClick={() => i18n.changeLanguage('es')}
        >
          ES
        </button>
      </div>
      <CountrySwitcher />
    </div>
  );
}
