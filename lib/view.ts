import { normalize, topPercent, type Listing } from './model';
export function storeName(name: string) {
  if (name === name.toUpperCase())
    return name
      .toLocaleLowerCase('pt-BR')
      .replace(/(^|\s)(\p{L})/gu, (s) => s.toLocaleUpperCase('pt-BR'))
      .replace(/\b(De|Da|Do|E|Dos|Das)\b/g, (s) => s.toLowerCase())
      .replace(/\bLtda\b/g, 'Ltda');
  return name;
}
export function picture(s: Listing) {
  if (s.image) return s.image;
  const cat = normalize(s.categoryName);
  if (cat === 'oticas')
    return normalize(s.name).includes('fralli') ? '/vitrine/armacoes.webp' : '/vitrine/otica.webp';
  if (cat === 'calcados') return '/vitrine/calcados.webp';
  if (cat === 'beleza') return '/vitrine/beleza.webp';
  if (cat === 'moda') return '/vitrine/moda.webp';
  return '';
}
export function badge(s: Listing) {
  const n = topPercent(s);
  if (n) {
    const up = s.offers.length > 1 || s.offers.some((o) => /at[eé]|\d+%\s+a\s+\d+%/i.test(o.title));
    return { prefix: up ? 'ATÉ' : '', value: n + '%', suffix: 'OFF' };
  }
  return {
    prefix: '',
    value: s.offers.length ? 'Oferta' : 'Loja',
    suffix: s.offers.length ? 'especial' : '',
  };
}
export function origin() {
  return (
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_URL
        ? 'https://' + process.env.VERCEL_URL
        : 'http://localhost:3000')
  ).replace(/\/$/, '');
}
