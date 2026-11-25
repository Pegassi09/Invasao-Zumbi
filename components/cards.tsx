import Link from 'next/link';
import { ArrowUpRight, Tag, MapPin, Store as Shop } from 'lucide-react';
import { type Listing, primaryOffer } from '@/lib/model';
import { badge, picture, storeName } from '@/lib/view';
import { Favorite, LocationLink } from './actions';
export function StoreCard({ store: s, compact = false }: { store: Listing; compact?: boolean }) {
  const img = picture(s),
    b = badge(s),
    o = primaryOffer(s);
  return (
    <article className="card">
      <div className={'cardpic' + (!img ? ' noimage' : '')}>
        {img ? (
          <img
            loading="lazy"
            src={img}
            alt={
              s.image
                ? 'Imagem de ' + storeName(s.name)
                : 'Ilustração da categoria ' + s.categoryName
            }
          />
        ) : (
          <Shop size={62} strokeWidth={1} />
        )}
        {img && !s.image && <span className="illustration">Foto ilustrativa</span>}
        <span className="discount">
          {b.prefix && <small>{b.prefix} </small>}
          {b.value} <small>{b.suffix}</small>
        </span>
        <Favorite id={s._id} />
      </div>
      <div className="cardbody">
        <span className="category">
          <Tag size={12} />
          {s.categoryName}
        </span>
        <h3>
          <Link href={'/lojas/' + s.slug}>{storeName(s.name)}</Link>
        </h3>
        <p className="cardaddress">
          <MapPin size={14} />
          {s.address || 'Endereço em conferência'}
        </p>
        {!compact && (
          <p className="snippet">
            {s.description ||
              [o?.title, o?.conditions].filter(Boolean).join(' · ') ||
              'Promoções em atualização.'}
          </p>
        )}
        <div className="cardlinks">
          <Link href={'/lojas/' + s.slug}>
            Ver ofertas <ArrowUpRight size={16} />
          </Link>
          <LocationLink href={'/lojas/' + s.slug + '#localizacao'} id={s._id}>
            Ver localização
          </LocationLink>
        </div>
      </div>
    </article>
  );
}
