import type { MetadataRoute } from 'next';
import { listing } from '@/lib/db';
import { origin } from '@/lib/view';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = origin(),
    stores = await listing();
  return [
    ...['/', '/lojas', '/mapa', '/ofertas', '/evento'].map((p) => ({ url: base + p })),
    ...stores.flatMap((s) => [
      { url: base + '/lojas/' + s.slug, lastModified: s.updated },
      ...s.offers.map((o) => ({ url: base + '/ofertas/' + o._id, lastModified: o.updated })),
    ]),
  ];
}
