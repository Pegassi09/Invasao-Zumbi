'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Biohazard, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { FavoriteNav } from './actions';
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Invasão Zumbi, início">
      <span className="brand-icon">
        <Biohazard size={29} strokeWidth={2.4} />
      </span>
      <span>
        INVASÃO <strong>ZUMBI</strong>
      </span>
    </Link>
  );
}
export function Nav() {
  const path = usePathname(),
    [open, setOpen] = useState(false);
  const links = [
    ['/', 'Início'],
    ['/lojas', 'Lojas'],
    ['/ofertas', 'Ofertas'],
    ['/mapa', 'Mapa'],
    ['/evento', 'O evento'],
  ];
  return (
    <header>
      <div className="wrap nav">
        <Brand />
        <nav aria-label="Navegação principal" className={open ? 'navlinks open' : 'navlinks'}>
          {links.map(([p, n]) => (
            <Link
              key={p}
              href={p}
              aria-current={(p === '/' ? path === p : path.startsWith(p)) ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {n}
            </Link>
          ))}
        </nav>
        <div className="row">
          <FavoriteNav />
          <button
            className="iconbtn hamburger"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
