import React from 'react';
import { useTranslation } from 'react-i18next';
import { getLocaleOptions, useLocale } from '../context/LocaleContext';

export default function CountrySwitcher() {
  const { t } = useTranslation();
  const { country, setCountry } = useLocale();
  const options = getLocaleOptions();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="country" className="text-sm font-medium">{t('Country')}</label>
      <select
        id="country"
        value={country}
        onChange={(e) => setCountry(e.target.value as typeof country)}
        className="border rounded px-2 py-1 text-sm"
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
