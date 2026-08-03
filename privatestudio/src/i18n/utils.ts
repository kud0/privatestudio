import { ui, defaultLang } from './ui';

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

/**
 * Devuelve el traductor de un idioma. Acepta claves dinamicas (las que salen
 * de arrays de datos como serviceCategories o faqs), por eso la firma es
 * string y no la union de claves literales.
 *
 * Se usa en build para escribir el texto en el HTML servido. El swap a otro
 * idioma sigue siendo client-side en LanguageProvider, que sobrescribe el
 * innerHTML de los [data-i18n]. Ambos leen el mismo diccionario: una sola
 * fuente de verdad.
 */
export function useTranslations(lang: keyof typeof ui) {
  const dict = ui[lang] as Record<string, string>;
  const fallback = ui[defaultLang] as Record<string, string>;
  return function t(key: string): string {
    return dict[key] ?? fallback[key] ?? '';
  };
}