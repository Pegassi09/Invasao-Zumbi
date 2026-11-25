'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, ArrowRight, Ticket, Tag } from 'lucide-react';
import { type Listing, normalize, topPercent, maxPercent, typeOfOffer } from '@/lib/model';
import { StoreCard } from './cards';
import { storeName } from '@/lib/view';
import { useFavorites } from './actions';
type Mode = 'lojas' | 'ofertas' | 'favoritos';
export function Catalog({
  stores,
  mode,
  initial = '',
}: {
  stores: Listing[];
  mode: Mode;
  initial?: string;
}) {
  const [q, Q] = useState(initial),
    [cat, C] = useState(''),
    [kind, K] = useState(''),
    [sort, S] = useState('az'),
    [limit, L] = useState(18),
    fav = useFavorites();
  const base = mode === 'favoritos' ? stores.filter((s) => fav.includes(s._id)) : stores;
  const categories = [...new Set(stores.map((s) => s.categoryName))].sort();
  const match = (o: Listing['offers'][number]) =>
    !kind ||
    (kind === 'Especial'
      ? o.featured
      : kind.endsWith('%')
        ? maxPercent(o.title) >= parseInt(kind)
        : typeOfOffer(o) === kind);
  const filtered = base.filter(
    (s) =>
      (!cat || cat === s.categoryName) &&
      (!kind || s.offers.some(match)) &&
      normalize(
        s.name +
          (mode === 'ofertas'
            ? ' ' + s.offers.map((o) => o.title + ' ' + o.conditions).join(' ')
            : ''),
      ).includes(normalize(q)),
  );
  const arranged = [...filtered].sort((a, b) =>
    sort === 'desc'
      ? topPercent(b) - topPercent(a) || a.name.localeCompare(b.name, 'pt-BR')
      : a.name.localeCompare(b.name, 'pt-BR'),
  );
  let offers = arranged.flatMap((s) =>
    s.offers
      .filter(
        (o) =>
          match(o) && normalize(s.name + ' ' + o.title + ' ' + o.conditions).includes(normalize(q)),
      )
      .map((o) => ({ s, o })),
  );
  if (sort === 'desc')
    offers = offers.sort((a, b) => maxPercent(b.o.title) - maxPercent(a.o.title));
  if (sort === 'recent') offers = offers.sort((a, b) => b.o.created.localeCompare(a.o.created));
  const count = mode === 'ofertas' ? offers.length : arranged.length;
  function reset() {
    Q('');
    C('');
    K('');
    S('az');
    L(18);
  }
  return (
    <>
      <div className="filterbox">
        <label className="search">
          <Search size={18} />
          <input
            value={q}
            onChange={(e) => {
              Q(e.target.value);
              L(18);
            }}
            placeholder={mode === 'ofertas' ? 'Buscar loja ou oferta' : 'Buscar pelo nome da loja'}
            aria-label="Pesquisa"
          />
        </label>
        <label>
          Categoria
          <select
            aria-label="Categoria"
            value={cat}
            onChange={(e) => {
              C(e.target.value);
              L(18);
            }}
          >
            <option value="">Todas as categorias</option>
            {categories.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Desconto
          <select
            aria-label="Desconto"
            value={kind}
            onChange={(e) => {
              K(e.target.value);
              L(18);
            }}
          >
            <option value="">Todos os descontos</option>
            {['Percentual', 'Preço especial', 'Benefício', 'Especial', '30%', '50%', '70%'].map(
              (x) => (
                <option key={x} value={x}>
                  {x.endsWith('%') ? 'A partir de ' + x : x}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Ordenar
          <select
            aria-label="Ordenar"
            value={sort}
            onChange={(e) => {
              S(e.target.value);
              L(18);
            }}
          >
            <option value="az">Nome de A a Z</option>
            <option value="desc">Maior desconto</option>
            {mode === 'ofertas' && <option value="recent">Mais recentes</option>}
          </select>
        </label>
      </div>
      <div className="between results">
        <span>
          {count} {mode === 'ofertas' ? 'oferta(s)' : 'loja(s)'}
        </span>
        {(q || cat || kind || sort !== 'az') && (
          <button className="textlink" onClick={reset}>
            Limpar filtros
          </button>
        )}
      </div>
      {count === 0 ? (
        <div className="empty">
          <Search />
          <h3>
            {mode === 'favoritos' && !fav.length
              ? 'Suas lojas favoritas aparecem aqui'
              : 'Nenhum resultado encontrado'}
          </h3>
          <p>
            {mode === 'favoritos' && !fav.length
              ? 'Toque no coração de uma loja para salvá-la neste dispositivo.'
              : 'Experimente outro nome ou remova os filtros.'}
          </p>
          <Link className="textlink" href="/lojas">
            Explorar lojas <ArrowRight size={16} />
          </Link>
        </div>
      ) : mode === 'ofertas' ? (
        <div className="grid cards">
          {offers.slice(0, limit).map(({ s, o }) => (
            <Link className="coupon" key={o._id} href={'/ofertas/' + o._id}>
              <span className="category">
                <Ticket size={15} />
                {o.featured ? 'Oferta especial' : 'Oferta da loja'}
              </span>
              <h3>{o.title}</h3>
              <p>{o.conditions}</p>
              <strong>
                {storeName(s.name)} <ArrowRight size={15} />
              </strong>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid cards">
          {arranged.slice(0, limit).map((s) => (
            <StoreCard key={s._id} store={s} />
          ))}
        </div>
      )}
      {count > limit && (
        <button className="button secondary more" onClick={() => L(limit + 18)}>
          Carregar mais
        </button>
      )}
    </>
  );
}
