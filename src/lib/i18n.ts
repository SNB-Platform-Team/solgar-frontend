import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import ru from '@/locales/ru.json'

export const LANGUAGES = [
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'en', label: 'English', short: 'EN' },
] as const

export type Language = (typeof LANGUAGES)[number]['code']

const STORAGE_KEY = 'lang'

// The user's pick lives only in this browser (localStorage), not on the
// account. Storage can be blocked (private mode etc.) — fall back to ru.
function storedLanguage(): Language {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'ru' || v === 'en') return v
  } catch {
    /* storage unavailable */
  }
  return 'ru'
}

export function setLanguage(lang: Language) {
  void i18n.changeLanguage(lang)
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* storage unavailable — the choice lasts until reload */
  }
}

void i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en } },
  lng: storedLanguage(),
  fallbackLng: 'ru',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
})

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})
document.documentElement.lang = i18n.language

export default i18n
