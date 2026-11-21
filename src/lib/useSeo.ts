import { useEffect } from 'react';

const SITE_NAME = 'DentalConnect';
const SITE_ORIGIN = 'https://main.d63zai2tg2i2u.amplifyapp.com';

type SeoOptions = {
  title: string;
  description: string;
  path?: string;
  structuredData?: Record<string, unknown>;
};

function setMeta(name: string, content: string, property = false) {
  const attribute = property ? 'property' : 'name';
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.append(element);
  }
  element.content = content;
}

export function useSeo({ title, description, path, structuredData }: SeoOptions) {
  const structuredDataJson = structuredData ? JSON.stringify(structuredData) : '';
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const canonicalUrl = `${SITE_ORIGIN}${path ?? window.location.pathname}`;
    document.title = fullTitle;
    setMeta('description', description);
    setMeta('og:type', 'website', true);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('twitter:card', 'summary');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.append(canonical);
    }
    canonical.href = canonicalUrl;

    let schema = document.getElementById('dentalconnect-page-schema') as HTMLScriptElement | null;
    if (structuredDataJson) {
      schema ??= document.createElement('script');
      schema.id = 'dentalconnect-page-schema';
      schema.type = 'application/ld+json';
      schema.textContent = structuredDataJson;
      document.head.append(schema);
    } else {
      schema?.remove();
    }

    return () => {
      schema?.remove();
      if (document.title === fullTitle) {
        document.title = 'DentalConnect | Encuentra tu consultorio ideal';
        setMeta(
          'description',
          'Encuentra consultorios dentales, compara servicios y consulta sus datos de contacto para solicitar atención.',
        );
        setMeta('og:title', 'DentalConnect | Tu sonrisa en las mejores manos', true);
        setMeta(
          'og:description',
          'Consulta consultorios, servicios y datos de contacto para elegir dónde solicitar atención.',
          true,
        );
        setMeta('og:url', `${SITE_ORIGIN}/clinics`, true);
        const defaultCanonical =
          document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (defaultCanonical) defaultCanonical.href = `${SITE_ORIGIN}/clinics`;
      }
    };
  }, [description, path, structuredDataJson, title]);
}
