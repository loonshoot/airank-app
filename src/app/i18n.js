'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translations from '../messages/en.json';

// Initialize i18next for the App Router
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      lng: 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      resources: {
        en: {
          translation: translations
        }
      }
    });
}

export default i18n; 