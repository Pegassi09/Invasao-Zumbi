import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Clock, MessageCircle, Phone, MapPin, ChevronRight, Store } from 'lucide-react';
import { findStore } from '@/lib/details';
import { storeName, origin } from '@/lib/view';
import { Favorite, Share, Visit, LocationLink } from '@/components/actions';
import { MiniMap } from '@/components/map';
import { OfferDetails } from '@/components/offer';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const s = await findStore((await params).slug);
  if (!s) return {};
  const title = storeName(s.name),
    description =
      s.description || [s.offers[0]?.title, s.address, 'Marília'].filter(Boolean).join(' · ');
  return {
    title,
    description,
    alternates: { canonical: '/lojas/' + s.slug },
    openGraph: {
      title,
      description,
      url: '/lojas/' + s.slug,
      images: [s.image || '/arte/social.jpg'],
    },
  };
}
export default async function Page({ params }: Props) {
  const s = await findStore((await params).slug);
  if (!s) notFound();
  const title = storeName(s.name);
  return (
    <div className="wrap inside">
      <Visit kind="loja" id={s._id} />
      <div className="crumb">
        <Link href="/lojas">Lojas</Link>
        <ChevronRight size={14} />
        {title}
      </div>
      <div className="storeheader">
        {s.image ? (
          <img src={s.image} alt={'Imagem de ' + title} />
        ) : (
          <span className="storeicon">
            <Store size={34} />
          </span>
        )}
        <div>
          <span className="kicker">{s.categoryName}</span>
          <h1>{title}</h1>
          <p>
            <MapPin size={15} /> {s.address || 'Endereço a confirmar'} · Marília, SP
          </p>
        </div>
      </div>
      {s.description && <p>{s.description}</p>}
      <div className="row wraprow">
        <Favorite id={s._id} label />
        <Share id={s._id} title={title} path={'/lojas/' + s.slug} />
        <LocationLink className="button secondary" id={s._id} href="#localizacao">
          <MapPin size={16} /> Ver localização
        </LocationLink>
        {s.phone && (
          <a className="button secondary" href={'tel:' + s.phone.replace(/[^\d+]/g, '')}>
            <Phone size={16} />
            {s.phone}
          </a>
        )}
        {s.whatsapp && (
          <a
            className="button secondary"
            href={
              'https://wa.me/' +
              (s.whatsapp.replace(/\D/g, '').length <= 11 ? '55' : '') +
              s.whatsapp.replace(/\D/g, '')
            }
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        )}
        {s.hours && (
          <span>
            <Clock size={16} /> {s.hours}
          </span>
        )}
      </div>
      <div className="detailgrid">
        <section>
          <h2>
            Ofertas da loja <small>{s.offers.length}</small>
          </h2>
          <div className="stack">
            {s.offers.map((o) => (
              <OfferDetails key={o._id} offer={o} name={title} />
            ))}
            {!s.offers.length && <p className="notice">Esta loja ainda não divulgou promoções.</p>}
          </div>
        </section>
        <MiniMap store={s} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Store',
            name: title,
            url: origin() + '/lojas/' + s.slug,
            address: {
              '@type': 'PostalAddress',
              streetAddress: s.address,
              addressLocality: 'Marília',
              addressRegion: 'SP',
            },
            ...(s.lat !== null && {
              geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
            }),
          }).replace(/</g, '\\u003c'),
        }}
      />
    </div>
  );
}
