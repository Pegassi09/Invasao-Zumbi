import Link from 'next/link';
import {
  MapPin,
  Store,
  Tags,
  CalendarDays,
  ArrowRight,
  MapPinned,
  ScanLine,
  Route,
  Heart,
} from 'lucide-react';
import { passportOn } from '@/lib/passport';
import { listing } from '@/lib/db';
import { eventTitle, topPercent } from '@/lib/model';
import { origin } from '@/lib/view';
import { Countdown, HomeExplore } from '@/components/home-explore';
import { Share } from '@/components/actions';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const [stores, passport] = await Promise.all([listing(), passportOn()]),
    total = stores.reduce((a, s) => a + s.offers.length, 0),
    maximum = Math.max(0, ...stores.map(topPercent));
  return (
    <>
      <section className="hero">
        <div className="heroart">
          <picture>
            <source media="(max-width:640px)" srcSet="/arte/hero-mobile.webp" />
            <img
              src="/arte/hero.webp"
              alt="O zumbi de Marília surge na névoa verde com sua sacola de descontos"
              fetchPriority="high"
            />
          </picture>
        </div>
        <div className="wrap herowrap">
          <div className="herocopy">
            <div className="eventdate">
              <span className="live-dot" /> BLACK FRIDAY <span className="sep">/</span>{' '}
              <CalendarDays size={13} /> 27 NOV 2026
            </div>
            <h1>
              <span>INVASÃO</span>
              <strong>ZUMBI</strong>
            </h1>
            <p className="herosub">NO COMÉRCIO DE MARÍLIA</p>
            <p className="intro">
              A caça aos descontos começou. Descubra as lojas participantes e trace sua rota pela
              cidade.
            </p>
            <div className="row heroctas">
              <Link className="button primary" href="/lojas">
                <Store size={17} /> Explorar lojas <ArrowRight size={16} />
              </Link>
              <Link className="button herooutline" href="/mapa">
                <MapPinned size={17} /> Ver mapa do evento
              </Link>
            </div>
          </div>
        </div>
        <div className="hazard" />
      </section>
      <section className="facts">
        <div className="wrap factgrid">
          {[
            [Store, stores.length, 'Lojas participantes'],
            [Tags, total, 'Ofertas disponíveis'],
            [ScanLine, maximum + '%', 'Maior desconto'],
            [CalendarDays, <Countdown key="date" />, 'Para o dia do evento'],
          ].map(([I, v, n]) => {
            const Icon = I as typeof Store;
            return (
              <div className="fact" key={n as string}>
                <Icon className="facticon" size={25} />
                <div>
                  <strong>{v as React.ReactNode}</strong>
                  <span>{n as string}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <HomeExplore stores={stores} />
      {passport && (
        <div className="wrap">
          <Link className="button primary" href="/passaporte">
            Abrir meu Passaporte Zumbi <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <section className="wrap participate">
        <div>
          <div className="kicker">
            <span className="dash" /> COMO PARTICIPAR
          </div>
          <h2>
            Prepare sua visita<span className="acid">.</span>
          </h2>
        </div>
        <div className="grid steps">
          {[
            [Store, 'Explore as lojas', 'Consulte os descontos e as condições de cada oferta.'],
            [
              Heart,
              'Salve suas favoritas',
              'Guarde as lojas que deseja visitar neste dispositivo.',
            ],
            [Route, 'Trace sua rota', 'Abra o mapa para planejar o caminho pelo comércio.'],
          ].map(([I, t, d]) => {
            const Icon = I as typeof Store;
            return (
              <div key={t as string}>
                <Icon size={23} />
                <h3>{t as string}</h3>
                <p>{d as string}</p>
              </div>
            );
          })}
        </div>
        <div className="row">
          <Link className="textlink" href="/evento">
            Conheça o evento <ArrowRight size={16} />
          </Link>
          <Share id="inicio" title={eventTitle} path="/" small />
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: eventTitle,
            startDate: '2026-11-27',
            endDate: '2026-11-27',
            location: {
              '@type': 'Place',
              name: 'Comércio de Marília',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Marília',
                addressRegion: 'SP',
                addressCountry: 'BR',
              },
            },
            image: origin() + '/arte/social.jpg',
            organizer: {
              '@type': 'Organization',
              name: 'Associação Comercial e de Inovação de Marília',
              url: 'https://acim.org.br/',
            },
          }),
        }}
      />
    </>
  );
}
