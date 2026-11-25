'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Tag, Flame, Clock3, Sparkles, SlidersHorizontal } from 'lucide-react';
import { type Listing, topPercent } from '@/lib/model';
import { StoreCard } from './cards';
export function Countdown() {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(
        new Date(),
      );
      setDays(Math.round((Date.parse('2026-11-27') - Date.parse(today)) / 86400000));
    };
    tick();
    const i = setInterval(tick, 60_000);
    return () => clearInterval(i);
  }, []);
  return (
    <span className="countdown">
      {days === null
        ? '27 NOV 2026'
        : days < 0
          ? 'Edição 2026 encerrada'
          : days === 0
            ? 'O evento é hoje'
            : days === 1
              ? 'Falta 1 dia'
              : 'Faltam ' + days + ' dias'}
    </span>
  );
}
export function HomeExplore({ stores }: { stores: Listing[] }) {
  const [tab, setTab] = useState(0);
  const tabs = [
    ['Destaques', Sparkles],
    ['Maiores descontos', Flame],
    ['Especiais', Tag],
    ['Recentes', Clock3],
  ] as const;
  const list =
    tab === 0
      ? stores.filter((s) => s.featured)
      : tab === 1
        ? stores.filter((s) => topPercent(s) > 0).sort((a, b) => topPercent(b) - topPercent(a))
        : tab === 2
          ? stores.filter((s) => s.offers.some((o) => o.featured))
          : stores
              .filter((s) => s.offers.length)
              .sort((a, b) =>
                b.offers
                  .map((o) => o.created)
                  .sort()
                  .at(-1)!
                  .localeCompare(
                    a.offers
                      .map((o) => o.created)
                      .sort()
                      .at(-1)!,
                  ),
              );
  if (tab === 0) list.sort((a, b) => topPercent(b) - topPercent(a));
  return (
    <section className="wrap showcase" id="radar">
      <div className="sectionhead">
        <div>
          <div className="kicker">
            <span className="dash" /> VITRINE DO EVENTO
          </div>
          <h2>
            Radar de ofertas<span className="acid">.</span>
          </h2>
        </div>
        <Link className="textlink" href="/ofertas">
          Ver todas as ofertas <ArrowRight size={16} />
        </Link>
      </div>
      <div className="radar-tools">
        <div className="tabs" aria-label="Selecionar vitrine">
          {tabs.map(([s, I], i) => (
            <button key={s} onClick={() => setTab(i)} aria-pressed={tab === i}>
              <I size={15} />
              {s}
            </button>
          ))}
        </div>
        <form action="/lojas" className="search smallsearch">
          <Search size={16} />
          <input name="q" aria-label="Pesquisar estabelecimentos" placeholder="Buscar uma loja…" />
        </form>
      </div>
      {list.length ? (
        <div className="grid cards">
          {list.slice(0, 3).map((s) => (
            <StoreCard key={s._id} store={s} compact />
          ))}
        </div>
      ) : (
        <p className="empty">Nenhuma loja nesta seleção.</p>
      )}
    </section>
  );
}
