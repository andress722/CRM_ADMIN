import type { AppProps } from 'next/app';
import { LocaleProvider } from '../context/LocaleContext';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <LocaleProvider>
        <Component {...pageProps} />
      </LocaleProvider>
    </I18nextProvider>
  );
}
