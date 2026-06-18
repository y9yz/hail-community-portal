import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './en.json';
import translationAR from './ar.json';

const resources = {
  en: { translation: translationEN },
  ar: { translation: translationAR }
};

i18n
  .use(LanguageDetector) 
  .use(initReactI18next) 
  .init({
    resources, 
    fallbackLng: 'ar', 
    interpolation: {
      escapeValue: false 
    }
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;