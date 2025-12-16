import { ar } from './locales/ar';
import { en } from './locales/en';

export type Language = 'ar' | 'en';

export const translations = {
  ar,
  en,
};

export type Translations = typeof ar;
