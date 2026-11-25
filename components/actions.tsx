'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Heart, Share2, Copy, Send, MessageCircle, X } from 'lucide-react';
import Link from 'next/link';
const key = 'invasao-zumbi-favoritos';
const listen = (callback: () => void) => {
  window.addEventListener('storage', callback);
  window.addEventListener('favoritos', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('favoritos', callback);
  };
};
function read() {
  try {
    return localStorage.getItem(key) || '[]';
  } catch {
    return '[]';
  }
}
export function useFavorites(): string[] {
  const saved = useSyncExternalStore(listen, read, () => '[]');
  try {
    const a = JSON.parse(saved);
    return Array.isArray(a) ? a.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
export function Favorite({ id, label = false }: { id: string; label?: boolean }) {
  const fav = useFavorites(),
    active = fav.includes(id);
  const [error, setError] = useState('');
  return (
    <>
      <button
        type="button"
        className={label ? 'button secondary' : 'iconbtn fav'}
        aria-pressed={active}
        title={active ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
        aria-label={active ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
        onClick={() => {
          try {
            localStorage.setItem(
              key,
              JSON.stringify(active ? fav.filter((k) => k !== id) : [...fav, id]),
            );
            window.dispatchEvent(new Event('favoritos'));
          } catch {
            setError('Armazenamento indisponível neste dispositivo.');
          }
        }}
      >
        <Heart size={18} fill={active ? 'currentColor' : 'none'} />
        {label && (active ? 'Salvo nos favoritos' : 'Salvar loja')}
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
export function FavoriteNav() {
  const f = useFavorites();
  return (
    <Link className="savednav" href="/favoritos" aria-label={'Favoritos, ' + f.length + ' lojas'}>
      <Heart size={16} />
      <span>Favoritos</span>
      <b>{f.length}</b>
    </Link>
  );
}
export function track(kind: string, id: string) {
  void fetch('/api/atividade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, id }),
    keepalive: true,
  }).catch(() => {});
}
export function Visit({ kind, id }: { kind: string; id: string }) {
  const seen = useRef('');
  useEffect(() => {
    if (seen.current !== kind + id) {
      track(kind, id);
      seen.current = kind + id;
    }
  }, [kind, id]);
  return null;
}
export function LocationLink({
  href,
  id,
  children,
  className,
}: {
  href: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith('https:') ? '_blank' : undefined}
      rel="noreferrer"
      onClick={() => track('localização', id)}
      className={className}
    >
      {children}
    </a>
  );
}
export function Share({
  id,
  title,
  path,
  small = false,
}: {
  id: string;
  title: string;
  path: string;
  small?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [url, setUrl] = useState(''),
    [note, setNote] = useState('');
  return (
    <>
      <button
        className={small ? 'textlink' : 'button secondary'}
        onClick={() => {
          setUrl(new URL(path, window.location.origin).href);
          setNote('');
          ref.current?.showModal();
        }}
      >
        <Share2 size={16} /> Compartilhar
      </button>
      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) ref.current.close();
        }}
        aria-label="Compartilhar"
      >
        <div className="between">
          <h2>Compartilhar</h2>
          <button className="iconbtn" aria-label="Fechar" onClick={() => ref.current?.close()}>
            <X />
          </button>
        </div>
        <p>{title}</p>
        <div className="stack">
          <a
            className="button primary"
            target="_blank"
            rel="noopener noreferrer"
            href={'https://wa.me/?text=' + encodeURIComponent(title + ' ' + url)}
            onClick={() => track('compartilhamento', id)}
          >
            <MessageCircle size={18} /> WhatsApp
          </a>
          {url && typeof navigator.share === 'function' && (
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  await navigator.share({ title, url });
                  track('compartilhamento', id);
                } catch (e) {
                  if ((e as Error).name !== 'AbortError') setNote('Use o link abaixo.');
                }
              }}
            >
              <Send size={17} /> Outras opções
            </button>
          )}
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                track('compartilhamento', id);
                setNote('Link copiado.');
              } catch {
                setNote(url);
              }
            }}
          >
            <Copy size={17} /> Copiar link
          </button>
          <p role="status">{note}</p>
        </div>
      </dialog>
    </>
  );
}
