import { cache } from 'react';
import { listing } from './db';
export const publicStores = cache(listing);
export const findStore = cache(async (slug: string) =>
  (await publicStores()).find((s) => s.slug === slug),
);
export const findOffer = cache(async (id: string) => {
  for (const s of await publicStores()) {
    const o = s.offers.find((o) => o._id === id);
    if (o) return { s, o };
  }
});
