export type Category = { _id: string; name: string };
export type Store = {
  _id: string;
  slug: string;
  name: string;
  address: string;
  category: string;
  description: string;
  phone: string;
  whatsapp: string;
  hours: string;
  image: string;
  lat: number | null;
  lng: number | null;
  locationSource: string;
  active: boolean;
  featured: boolean;
  created: string;
  updated: string;
};
export type Offer = {
  _id: string;
  storeId: string;
  title: string;
  conditions: string;
  start: string;
  end: string;
  active: boolean;
  featured: boolean;
  created: string;
  updated: string;
  importKey?: string;
};
export type PublicOffer = Omit<Offer, 'importKey'>;
export type Listing = Store & { categoryName: string; offers: PublicOffer[] };
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
export const slugify = (s: string) => normalize(s).replaceAll(' ', '-');
export const maxPercent = (s: string) =>
  Math.max(
    0,
    ...Array.from(s.matchAll(/(\d+(?:[,.]\d+)?)\s*%/g), (m) => Number(m[1].replace(',', '.'))),
  );
export const topPercent = (s: Listing) => Math.max(0, ...s.offers.map((o) => maxPercent(o.title)));
export function primaryOffer(s: Listing) {
  return [...s.offers].sort((a, b) => maxPercent(b.title) - maxPercent(a.title))[0];
}
export function typeOfOffer(o: PublicOffer) {
  if (maxPercent(o.title)) return 'Percentual';
  if (/R\$|\d+[.,]\d{2}/i.test(o.title + ' ' + o.conditions)) return 'Preço especial';
  return 'Benefício';
}
export function todaySP() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}
export function blankStore(): Omit<Store, '_id' | 'slug' | 'created' | 'updated'> {
  return {
    name: '',
    address: '',
    category: '',
    description: '',
    phone: '',
    whatsapp: '',
    hours: '',
    image: '',
    lat: null,
    lng: null,
    locationSource: '',
    active: true,
    featured: false,
  };
}
export function mapLinks(s: Store) {
  const confirmed = s.lat !== null && s.lng !== null;
  const full = confirmed
    ? s.lat + ',' + s.lng
    : [s.name, s.address, 'Marília, SP, Brasil'].filter(Boolean).join(', ');
  return {
    search: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(full),
    directions: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(full),
  };
}
export const eventTitle = 'Invasão Zumbi no Comércio de Marília';
