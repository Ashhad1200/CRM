import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../locales/en.json';
import ar from '../locales/ar.json';

/** RTL languages list */
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

export function isRtl(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang);
}

/** Apply dir attribute to <html> based on current language */
function applyDirection(lang: string): void {
  const dir = isRtl(lang) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'softcrm_lang',
      caches: ['localStorage'],
    },
  });

// Set direction on init
applyDirection(i18n.language);

// Update direction on language change
i18n.on('languageChanged', (lang) => {
  applyDirection(lang);
});

export default i18n;
