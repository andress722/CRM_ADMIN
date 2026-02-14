import React from 'react';
import { useTranslation } from 'react-i18next';
import CountrySwitcher from './CountrySwitcher';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <div className="mb-4 flex flex-wrap gap-3 items-center">
      <div className="flex gap-2 items-center">
        <button
          className={`px-3 py-1 rounded ${i18n.language === 'pt' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => i18n.changeLanguage('pt')}
        >
          PT
        </button>
        <button
          className={`px-3 py-1 rounded ${i18n.language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => i18n.changeLanguage('en')}
        >
          EN
        </button>
        <button
          className={`px-3 py-1 rounded ${i18n.language === 'es' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => i18n.changeLanguage('es')}
        >
          ES
        </button>
      </div>
      <CountrySwitcher />
    </div>
  );
}
