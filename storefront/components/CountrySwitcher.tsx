import React from 'react';
import { useTranslation } from 'react-i18next';
import { getLocaleOptions, useLocale } from '../context/LocaleContext';

export default function CountrySwitcher() {
  const { t } = useTranslation();
  const { country, setCountry } = useLocale();
  const options = getLocaleOptions();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="country" className="text-xs font-semibold text-slate-500">{t('Country')}</label>
      <select
        id="country"
        value={country}
        onChange={(e) => setCountry(e.target.value as typeof country)}
        className="soft-panel text-sm text-slate-700"
      >
        {options.map(option => (
          <option key={option.code} value={option.code}>
            {t(option.label)}
          </option>
        ))}
      </select>
    </div>
  );
}
