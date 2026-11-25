'use client';
import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import { Search, MapPin, ExternalLink, Route, Maximize } from 'lucide-react';
import Link from 'next/link';
import { type Listing, normalize, mapLinks, primaryOffer } from '@/lib/model';
import { storeName } from '@/lib/view';
import { LocationLink, Share, track } from './actions';
function Tiles({ stores }: { stores: Listing[] }) {
  const el = useRef<HTMLDivElement>(null),
    [instance, setInstance] = useState<{
      L: typeof import('leaflet');
      map: LeafletMap;
      group: LayerGroup;
    } | null>(null),
    [error, E] = useState(false),
    [fullscreen, F] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    let ro: ResizeObserver | null = null;
    async function init() {
      const L = await import('leaflet');
      if (cancelled || !el.current) return;
      map = L.map(el.current, {
        scrollWheelZoom: false,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      }).setView([-22.22, -49.95], 14);
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      tiles.on('tileerror', () => {
        if (!cancelled) E(true);
      });
      tiles.on('tileload', () => {
        if (!cancelled) E(false);
      });
      ro = new ResizeObserver(() => {
        if (!cancelled) map?.invalidateSize({ pan: false });
      });
      ro.observe(el.current);
      setInstance({ L, map, group: L.layerGroup().addTo(map) });
    }
    init().catch(() => {
      if (!cancelled) E(true);
    });
    return () => {
      cancelled = true;
      ro?.disconnect();
      map?.stop();
      map?.remove();
      map = null;
    };
  }, []);
  useEffect(() => {
    if (!instance) return;
    const { L, map, group } = instance;
    map.closePopup();
    group.clearLayers();
    const pts: L.LatLngTuple[] = [];
    const groups = new Map<string, Listing[]>();
    for (const store of stores) {
      if (store.lat === null || store.lng === null) continue;
      const k = store.lat + ',' + store.lng;
      groups.set(k, [...(groups.get(k) || []), store]);
    }
    for (const list of groups.values()) {
      const s = list[0],
        pos: L.LatLngTuple = [s.lat!, s.lng!];
      pts.push(pos);
      const box = document.createElement('div');
      for (const v of list) {
        const name = document.createElement('strong'),
          info = document.createElement('p'),
          a = document.createElement('a');
        name.textContent = storeName(v.name);
        info.textContent = primaryOffer(v)?.title || 'Promoções em atualização';
        a.href = '/lojas/' + v.slug;
        a.textContent = 'Ver loja →';
        box.append(name, info, a);
      }
      const marker = L.marker(pos, {
        title: list.map((x) => storeName(x.name)).join(' / '),
        alt: 'Localização de ' + storeName(s.name),
        icon: L.divIcon({
          className: 'marker-wrap',
          html: '<span class="pin-dot">' + (list.length > 1 ? list.length : '●') + '</span>',
          iconSize: [30, 34],
          iconAnchor: [15, 32],
        }),
      })
        .addTo(group)
        .bindPopup(box, { autoPan: false });
      marker.on('click', () => track('localização', s._id));
    }
    if (pts.length === 1) map.setView(pts[0], 17, { animate: false });
    else if (pts.length > 1)
      map.fitBounds(L.latLngBounds(pts), { padding: [32, 32], maxZoom: 17, animate: false });
    else map.setView([-22.22, -49.95], 14, { animate: false });
  }, [instance, stores]);
  useEffect(() => {
    if (!fullscreen) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') F(false);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [fullscreen]);
  return (
    <div className={'mapframe' + (fullscreen ? ' expanded' : '')}>
      <div className="tilemap" ref={el} aria-label="Mapa interativo de Marília" />
      <button className="mapexpand" onClick={() => F(!fullscreen)}>
        <Maximize size={15} />
        {fullscreen ? 'Reduzir mapa' : 'Ampliar mapa'}
      </button>
      {error && (
        <span className="tileerror">
          Falha ao carregar o mapa base. Os endereços estão disponíveis na lista.
        </span>
      )}
    </div>
  );
}
export function MiniMap({ store: s }: { store: Listing }) {
  const links = mapLinks(s);
  return (
    <section className="panel location" id="localizacao">
      <h2>Localização</h2>
      <p>
        <MapPin size={16} /> {s.address || 'Endereço a confirmar'} · Marília, SP
      </p>
      {s.lat !== null && s.lng !== null ? (
        <Tiles stores={[s]} />
      ) : (
        <p className="notice">A organização precisa confirmar o ponto desta loja no mapa.</p>
      )}
      <div className="row">
        {(s.address || s.lat !== null) && (
          <LocationLink className="button primary" id={s._id} href={links.directions}>
            <Route size={17} /> Traçar rota
          </LocationLink>
        )}
        <LocationLink className="button secondary" id={s._id} href={links.search}>
          <ExternalLink size={16} /> Abrir no Google Maps
        </LocationLink>
      </div>
    </section>
  );
}
export function EventMap({ stores }: { stores: Listing[] }) {
  const [q, Q] = useState(''),
    [cat, C] = useState('');
  const cats = [...new Set(stores.map((s) => s.categoryName))].sort();
  const list = stores.filter(
    (s) =>
      (!cat || s.categoryName === cat) &&
      normalize(s.name + ' ' + s.address).includes(normalize(q)),
  );
  const n = list.filter((s) => s.lat !== null).length;
  return (
    <>
      <div className="filterbox mapfilters">
        <label className="search">
          <Search size={18} />
          <input
            value={q}
            onChange={(e) => Q(e.target.value)}
            aria-label="Pesquisar no mapa"
            placeholder="Pesquisar loja ou endereço"
          />
        </label>
        <label>
          Categoria
          <select aria-label="Categoria" value={cat} onChange={(e) => C(e.target.value)}>
            <option value="">Todas as categorias</option>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <Share id="mapa" title="Mapa da Invasão Zumbi em Marília" path="/mapa" />
      </div>
      <div className="maplayout">
        <div>
          <Tiles stores={list} />
          <p className="muted">
            {n} unidade(s) no mapa · {list.length - n} com localização a confirmar. Coordenadas
            iniciais do CNEFE/IBGE.
          </p>
        </div>
        <div className="maplist">
          <h2>
            Lojas no resultado <small>{list.length}</small>
          </h2>
          {list.map((s) => (
            <Link key={s._id} href={'/lojas/' + s.slug + '#localizacao'}>
              <strong>{storeName(s.name)}</strong>
              <span>{s.address || 'Endereço a confirmar'}</span>
              <small>
                {s.lat === null ? 'Localização a confirmar' : primaryOffer(s)?.title || 'Ver loja'}{' '}
                →
              </small>
            </Link>
          ))}
          {!list.length && <p>Nenhuma loja encontrada.</p>}
        </div>
      </div>
    </>
  );
}
