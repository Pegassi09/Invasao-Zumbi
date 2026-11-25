import Link from 'next/link';
import { Ticket, ArrowUpRight } from 'lucide-react';
import { type PublicOffer, todaySP } from '@/lib/model';
import { Share } from './actions';
export function OfferDetails({ offer: o, name }: { offer: PublicOffer; name: string }) {
  const date = (d: string) => d.split('-').reverse().join('/');
  return (
    <article className="coupon detailed">
      <span className="category">
        <Ticket size={16} />
        {o.featured ? 'Promoção especial' : 'Promoção'}
      </span>
      <h3>
        <Link href={'/ofertas/' + o._id}>{o.title}</Link>
      </h3>
      {o.conditions && <p>{o.conditions}</p>}
      {(o.start || o.end) && (
        <p>
          {o.start &&
            (o.start > todaySP() ? 'Disponível a partir de ' : 'Início em ') + date(o.start)}{' '}
          {o.end && ' · Válida até ' + date(o.end)}
        </p>
      )}
      <div className="row">
        <Link className="textlink" href={'/ofertas/' + o._id}>
          Ver oferta <ArrowUpRight size={15} />
        </Link>
        <Share id={o._id} title={name + ' — ' + o.title} path={'/ofertas/' + o._id} small />
      </div>
    </article>
  );
}
